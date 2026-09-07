import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DigiArbetsformedlingenAngularModule } from '@designsystem-se/af-angular';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommentsService, NuxeoComment } from '@app/core/services/comments.service';
import { DeleteCommentModalComponent } from '@app/shared/components/delete-comment-modal/delete-comment-modal.component';
import { AuthService } from '@app/core/services/auth.service';
import { ImageButtonComponent } from '@app/shared/components/image-button/image-button.component';
import { getInitials as getInitialsFromName } from '@app/shared/utils/initials';

export interface CommentNode {
  id: string;
  parentId?: string;
  author: string;
  createdAt: Date;
  text: string;
  numberOfReplies?: number;
  children: CommentNode[];
}

interface InputEventDetail {
  target?: EventTarget | null;
}

@Component({
  selector: 'nuxeo-comments',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DigiArbetsformedlingenAngularModule,
    DeleteCommentModalComponent,
    ImageButtonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './comments.component.html',
})
export class CommentsComponent {
  readonly documentId = input.required<string>();
  maxHeight = input();

  private readonly commentsService = inject(CommentsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);

  comments = signal<CommentNode[]>([]);
  isLoading = signal(false);
  isSubmitting = signal(false);
  newComment = signal('');
  replyText = signal('');
  replyTargetId = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  openReplies = signal<Record<string, boolean>>({});
  editingCommentId = signal<string | null>(null);
  editText = signal('');
  actionsMenuOpenId = signal<string | null>(null);
  isSavingEdit = signal(false);
  deleteTargetId = signal<string | null>(null);
  isDeleting = signal(false);
  currentUsername = computed(() => this.toAuthorKey(this.auth.username() ?? ''));
  currentFullName = computed(() => this.toAuthorKey(this.auth.fullName()));

  readonly loadCommentsEffect = effect(() => {
    const documentIdValue = this.documentId();
    if (!documentIdValue) return;
    this.fetchComments(documentIdValue);
  });

  trackById(index: number, item: CommentNode) {
    return item.id;
  }

  getInitials(name?: string): string {
    return getInitialsFromName(name);
  }

  onNewCommentInput(event: Event | CustomEvent<InputEventDetail>) {
    this.newComment.set(this.extractInputValue(event));
  }

  onReplyInput(event: Event | CustomEvent<InputEventDetail>) {
    this.replyText.set(this.extractInputValue(event));
  }

  onEditInput(event: Event | CustomEvent<InputEventDetail>) {
    this.editText.set(this.extractInputValue(event));
  }

  canManageComment(comment: CommentNode): boolean {
    const author = this.toAuthorKey(comment.author);
    if (!author) return false;

    const username = this.currentUsername();
    const fullName = this.currentFullName();

    return (!!username && author === username) || (!!fullName && author === fullName);
  }

  submitComment(event?: Event) {
    event?.preventDefault();
    const isReply = !!this.replyTargetId();
    const text = isReply ? this.replyText().trim() : this.newComment().trim();
    if (!text || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    const targetEntityId = this.replyTargetId() ?? this.documentId();
    const parentCommentId = this.replyTargetId() ?? this.documentId();

    this.commentsService
      .addComment(targetEntityId, text, parentCommentId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: comment => {
          if (isReply && comment.parentId) {
            this.comments.update(currentComments =>
              this.addReplyToTree(currentComments, comment.parentId!, this.mapToNode(comment))
            );
            this.replyText.set('');
            this.replyTargetId.set(null);
          } else {
            this.comments.update(currentComments => [...currentComments, this.mapToNode(comment)]);
            this.newComment.set('');
          }
          this.isSubmitting.set(false);
          this.errorMessage.set(null);
        },
        error: () => {
          this.isSubmitting.set(false);
          this.errorMessage.set('Kunde inte spara kommentaren.');
        },
      });
  }

  submitNewComment(event?: Event) {
    this.replyTargetId.set(null);
    this.replyText.set('');
    this.submitComment(event);
  }

  submitReply(commentId: string, event?: Event) {
    this.replyTargetId.set(commentId);
    this.submitComment(event);
  }

  isRepliesOpen(commentId: string) {
    return !!this.openReplies()[commentId];
  }

  toggleReplies(comment: CommentNode) {
    const isOpen = !this.isRepliesOpen(comment.id);
    this.openReplies.update(state => ({ ...state, [comment.id]: isOpen }));
  }

  repliesCount(comment: CommentNode) {
    return comment.children.length || comment.numberOfReplies || 0;
  }

  toggleActionsMenu(commentId: string) {
    this.actionsMenuOpenId.set(this.actionsMenuOpenId() === commentId ? null : commentId);
  }

  @HostListener('document:click', ['$event'])
  closeActionsMenuOnOutsideClick(event: MouseEvent) {
    const openId = this.actionsMenuOpenId();
    if (!openId) return;

    const target = event.target as HTMLElement | null;
    if (!target) {
      this.actionsMenuOpenId.set(null);
      return;
    }

    const actionsContainer = target.closest('[data-comment-actions]');
    if (!actionsContainer) {
      this.actionsMenuOpenId.set(null);
      return;
    }

    const containerId = actionsContainer.getAttribute('data-comment-actions');
    if (containerId !== openId) {
      this.actionsMenuOpenId.set(null);
    }
  }

  startEdit(comment: CommentNode) {
    this.editingCommentId.set(comment.id);
    this.editText.set(comment.text);
    this.replyTargetId.set(null);
    this.replyText.set('');
    this.actionsMenuOpenId.set(null);
  }

  cancelEdit() {
    this.editingCommentId.set(null);
    this.editText.set('');
    this.isSavingEdit.set(false);
  }

  saveEdit() {
    const commentId = this.editingCommentId();
    const text = this.editText().trim();
    if (!commentId || !text || this.isSavingEdit()) return;

    const targetComment = this.findCommentById(this.comments(), commentId);
    const parentId = targetComment?.parentId ?? this.documentId();

    this.isSavingEdit.set(true);
    this.commentsService
      .updateComment(commentId, parentId, text)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: updatedComment => {
          const updatedNode = this.mapToNode(updatedComment);
          this.comments.update(tree => this.replaceCommentInTree(tree, updatedNode));
          this.isSavingEdit.set(false);
          this.editingCommentId.set(null);
          this.editText.set('');
          this.actionsMenuOpenId.set(null);
          this.errorMessage.set(null);
        },
        error: () => {
          this.isSavingEdit.set(false);
          this.errorMessage.set('Kunde inte uppdatera kommentaren.');
        },
      });
  }

  requestDelete(comment: CommentNode) {
    this.deleteTargetId.set(comment.id);
    this.actionsMenuOpenId.set(null);
  }

  cancelDelete() {
    this.deleteTargetId.set(null);
    this.isDeleting.set(false);
  }

  confirmDelete() {
    const commentId = this.deleteTargetId();
    if (!commentId || this.isDeleting()) return;

    const targetComment = this.findCommentById(this.comments(), commentId);
    const parentId = targetComment?.parentId ?? this.documentId();

    this.isDeleting.set(true);
    this.commentsService
      .deleteComment(parentId, commentId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.comments.update(tree => this.removeCommentFromTree(tree, commentId));
          this.isDeleting.set(false);
          this.deleteTargetId.set(null);
          this.errorMessage.set(null);
        },
        error: () => {
          this.isDeleting.set(false);
          this.errorMessage.set('Kunde inte radera kommentaren.');
        },
      });
  }

  private fetchComments(documentId: string) {
    this.isLoading.set(true);
    this.commentsService
      .getComments(documentId, { pageSize: 50, currentPageIndex: 0 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          const roots = this.buildTree(response.entries ?? [], documentId);
          this.sortCommentsTree(roots);
          this.comments.set(roots);

          this.loadRepliesForList(roots);
          this.errorMessage.set(null);
          this.isLoading.set(false);
        },
        error: () => {
          this.errorMessage.set('Kunde inte hämta kommentarer.');
          this.isLoading.set(false);
        },
      });
  }

  private buildTree(entries: NuxeoComment[], documentId: string): CommentNode[] {
    const nodeMap = new Map<string, CommentNode>();

    entries.forEach(entry => {
      if (!entry.id) return;
      nodeMap.set(entry.id, this.mapToNode(entry));
    });

    const roots: CommentNode[] = [];

    nodeMap.forEach(node => {
      if (node.parentId && nodeMap.has(node.parentId)) {
        nodeMap.get(node.parentId)?.children.push(node);
      } else if (node.parentId === documentId) {
        roots.push(node);
      }
    });

    return roots;
  }

  private mapToNode(comment: NuxeoComment): CommentNode {
    return {
      id: comment.id ?? crypto.randomUUID(),
      parentId: comment.parentId,
      author: comment.author ?? 'Okänd',
      createdAt: comment.creationDate ? new Date(comment.creationDate) : new Date(),
      text: comment.text,
      numberOfReplies: comment.numberOfReplies,
      children: [],
    };
  }

  startReply(commentId: string) {
    this.replyTargetId.set(commentId);
    this.replyText.set('');
  }

  cancelReply() {
    this.replyTargetId.set(null);
    this.replyText.set('');
  }

  private addReplyToTree(tree: CommentNode[], parentId: string, reply: CommentNode): CommentNode[] {
    return tree.map(node => {
      if (node.id === parentId) {
        return { ...node, children: [...node.children, reply] };
      }
      return { ...node, children: this.addReplyToTree(node.children, parentId, reply) };
    });
  }

  private setChildren(tree: CommentNode[], parentId: string, children: CommentNode[]): CommentNode[] {
    return tree.map(node => {
      if (node.id === parentId) {
        return { ...node, children };
      }
      return { ...node, children: this.setChildren(node.children, parentId, children) };
    });
  }

  private replaceCommentInTree(tree: CommentNode[], updatedNode: CommentNode): CommentNode[] {
    return tree.map(node => {
      if (node.id === updatedNode.id) {
        return { ...node, ...updatedNode, children: node.children };
      }
      return { ...node, children: this.replaceCommentInTree(node.children, updatedNode) };
    });
  }

  private removeCommentFromTree(tree: CommentNode[], id: string): CommentNode[] {
    return tree
      .filter(node => node.id !== id)
      .map(node => ({ ...node, children: this.removeCommentFromTree(node.children, id) }));
  }

  private findCommentById(tree: CommentNode[], id: string): CommentNode | null {
    for (const node of tree) {
      if (node.id === id) return node;
      const childResult = this.findCommentById(node.children, id);
      if (childResult) return childResult;
    }
    return null;
  }

  private loadRepliesForList(nodes: CommentNode[]) {
    nodes.forEach(node => this.loadRepliesForNode(node));
  }

  private loadRepliesForNode(node: CommentNode) {
    this.commentsService
      .getComments(node.id, { pageSize: 50, currentPageIndex: 0 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          const children = (response.entries ?? []).map(entry => this.mapToNode(entry));
          this.sortCommentsTree(children);
          this.comments.update(tree => this.setChildren(tree, node.id, children));
          if (children.length) {
            this.loadRepliesForList(children);
          }
        },
        error: () => {
          this.errorMessage.set('Kunde inte hämta svar för en kommentar.');
        },
      });
  }

  private sortCommentsTree(nodes: CommentNode[]) {
    nodes.sort((firstComment, secondComment) => firstComment.createdAt.getTime() - secondComment.createdAt.getTime());
    nodes.forEach(child => this.sortCommentsTree(child.children));
  }

  private extractInputValue(event: Event | CustomEvent<InputEventDetail>): string {
    const detailTarget = (event as CustomEvent<InputEventDetail>)?.detail?.target;
    const target = (detailTarget ?? event.target) as HTMLInputElement | HTMLTextAreaElement | null;
    const value = target?.value;
    return typeof value === 'string' ? value : value !== undefined && value !== null ? String(value) : '';
  }

  private toAuthorKey(value?: string): string {
    return typeof value === 'string' ? value : '';
  }
}
