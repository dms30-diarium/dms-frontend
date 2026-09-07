import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, computed } from '@angular/core';
import { of, throwError } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { CommentsComponent, CommentNode } from './comments.component';
import { CommentsService, NuxeoComment, NuxeoCommentList } from '@app/core/services/comments.service';
import { AuthService } from '@app/core/services/auth.service';

function makeAuthMock(username = 'testuser', fullName = 'Test User') {
  return {
    loaded: signal(true),
    loadError: signal(null),
    username: signal<string | null>(username),
    activeRole: signal<string | null>(null),
    adminViewEnabled: signal(false),
    isAdmin: computed(() => false),
    user: signal<unknown>(undefined),
    roles: signal<string[]>([]),
    fullName: computed(() => fullName),
    loadMe: jasmine.createSpy('loadMe').and.returnValue(Promise.resolve()),
    hasRole: jasmine.createSpy('hasRole').and.returnValue(false),
  };
}

function makeComment(overrides: Partial<NuxeoComment> = {}): NuxeoComment {
  return {
    'entity-type': 'comment',
    id: 'comment-1',
    parentId: 'doc-1',
    author: 'testuser',
    text: 'Test comment',
    creationDate: new Date('2024-01-01').toISOString(),
    numberOfReplies: 0,
    ...overrides,
  };
}

function makeCommentList(overrides: Partial<NuxeoCommentList> = {}): NuxeoCommentList {
  return {
    'entity-type': 'comments',
    entries: [],
    ...overrides,
  };
}

function makeCommentNode(overrides: Partial<CommentNode> & { id: string } = { id: 'c1' }): CommentNode {
  return {
    author: 'a',
    createdAt: new Date(),
    text: 'x',
    children: [],
    ...overrides,
  };
}

describe('CommentsComponent', () => {
  let component: CommentsComponent;
  let fixture: ComponentFixture<CommentsComponent>;
  let commentsSpy: jasmine.SpyObj<CommentsService>;
  let authMock: ReturnType<typeof makeAuthMock>;

  beforeEach(async () => {
    commentsSpy = jasmine.createSpyObj('CommentsService', [
      'getComments',
      'addComment',
      'updateComment',
      'deleteComment',
    ]);
    commentsSpy.getComments.and.returnValue(of(makeCommentList()));
    commentsSpy.addComment.and.returnValue(of(makeComment()));
    commentsSpy.updateComment.and.returnValue(of(makeComment({ text: 'Updated text' })));
    commentsSpy.deleteComment.and.returnValue(of(undefined));

    authMock = makeAuthMock();

    await TestBed.configureTestingModule({
      imports: [CommentsComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: CommentsService, useValue: commentsSpy },
        { provide: AuthService, useValue: authMock },
      ],
    })
      .overrideTemplate(CommentsComponent, '<div></div>')
      .compileComponents();

    fixture = TestBed.createComponent(CommentsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('documentId', 'doc-1');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('loadCommentsEffect', () => {
    it('fetches comments for documentId on init', () => {
      expect(commentsSpy.getComments).toHaveBeenCalledWith('doc-1', jasmine.objectContaining({}));
    });

    it('sets errorMessage on load failure', () => {
      commentsSpy.getComments.and.returnValue(throwError(() => new Error('fail')));
      fixture.componentRef.setInput('documentId', 'doc-error');
      fixture.detectChanges();
      expect(component.errorMessage()).toBe('Kunde inte hämta kommentarer.');
    });
  });

  describe('signals initial state', () => {
    it('comments defaults to empty array', () => {
      expect(component.comments()).toEqual([]);
    });

    it('isLoading defaults to false', () => {
      expect(component.isLoading()).toBeFalse();
    });

    it('isSubmitting defaults to false', () => {
      expect(component.isSubmitting()).toBeFalse();
    });

    it('newComment defaults to empty string', () => {
      expect(component.newComment()).toBe('');
    });

    it('replyText defaults to empty string', () => {
      expect(component.replyText()).toBe('');
    });

    it('replyTargetId defaults to null', () => {
      expect(component.replyTargetId()).toBeNull();
    });

    it('errorMessage defaults to null', () => {
      expect(component.errorMessage()).toBeNull();
    });

    it('editingCommentId defaults to null', () => {
      expect(component.editingCommentId()).toBeNull();
    });

    it('editText defaults to empty string', () => {
      expect(component.editText()).toBe('');
    });

    it('actionsMenuOpenId defaults to null', () => {
      expect(component.actionsMenuOpenId()).toBeNull();
    });

    it('isSavingEdit defaults to false', () => {
      expect(component.isSavingEdit()).toBeFalse();
    });

    it('deleteTargetId defaults to null', () => {
      expect(component.deleteTargetId()).toBeNull();
    });

    it('isDeleting defaults to false', () => {
      expect(component.isDeleting()).toBeFalse();
    });
  });

  describe('currentUsername computed', () => {
    it('returns username from auth', () => {
      expect(component.currentUsername()).toBe('testuser');
    });

    it('returns empty string when username is null', () => {
      authMock.username.set(null);
      expect(component.currentUsername()).toBe('');
    });
  });

  describe('getInitials', () => {
    it('returns initials from name', () => {
      expect(component.getInitials('Anna Svensson')).toBe('AS');
    });

    it('returns bullet for empty name', () => {
      expect(component.getInitials('')).toBe('•');
    });
  });

  describe('trackById', () => {
    it('returns comment id', () => {
      expect(component.trackById(0, makeCommentNode({ id: 'comment-42' }))).toBe('comment-42');
    });
  });

  describe('onNewCommentInput', () => {
    it('updates newComment signal from input event', () => {
      const input = document.createElement('input');
      input.value = 'Hello world';
      const event = new Event('input');
      Object.defineProperty(event, 'target', { value: input });
      component.onNewCommentInput(event);
      expect(component.newComment()).toBe('Hello world');
    });

    it('updates newComment from CustomEvent detail.target', () => {
      const input = document.createElement('input');
      input.value = 'Custom event value';
      const event = new CustomEvent('input', { detail: { target: input } });
      component.onNewCommentInput(event);
      expect(component.newComment()).toBe('Custom event value');
    });
  });

  describe('onReplyInput', () => {
    it('updates replyText signal', () => {
      const input = document.createElement('textarea');
      input.value = 'Reply text';
      const event = new Event('input');
      Object.defineProperty(event, 'target', { value: input });
      component.onReplyInput(event);
      expect(component.replyText()).toBe('Reply text');
    });
  });

  describe('onEditInput', () => {
    it('updates editText signal', () => {
      const input = document.createElement('input');
      input.value = 'Edit text';
      const event = new Event('input');
      Object.defineProperty(event, 'target', { value: input });
      component.onEditInput(event);
      expect(component.editText()).toBe('Edit text');
    });
  });

  describe('canManageComment', () => {
    it('returns true when author matches currentUsername', () => {
      authMock.username.set('alice');
      const comment = makeCommentNode({ author: 'alice', id: 'c1' });
      expect(component.canManageComment(comment)).toBeTrue();
    });

    it('returns false when author does not match', () => {
      authMock.username.set('alice');
      const comment = makeCommentNode({ author: 'bob', id: 'c1' });
      expect(component.canManageComment(comment)).toBeFalse();
    });

    it('returns false when author is empty', () => {
      const comment = makeCommentNode({ author: '', id: 'c1' });
      expect(component.canManageComment(comment)).toBeFalse();
    });
  });

  describe('submitComment', () => {
    it('does nothing when newComment is empty', () => {
      component.newComment.set('');
      component.submitComment();
      expect(commentsSpy.addComment).not.toHaveBeenCalled();
    });

    it('calls addComment and clears newComment on success', () => {
      component.newComment.set('Hello comment');
      commentsSpy.addComment.and.returnValue(of(makeComment({ parentId: 'doc-1' })));
      component.submitNewComment();
      expect(commentsSpy.addComment).toHaveBeenCalledWith('doc-1', 'Hello comment', 'doc-1');
      expect(component.newComment()).toBe('');
    });

    it('sets errorMessage on failure', () => {
      component.newComment.set('Failing comment');
      commentsSpy.addComment.and.returnValue(throwError(() => new Error('fail')));
      component.submitNewComment();
      expect(component.errorMessage()).toBe('Kunde inte spara kommentaren.');
    });
  });

  describe('submitReply', () => {
    it('sets replyTargetId and calls addComment', () => {
      component.replyText.set('Reply text');
      commentsSpy.addComment.and.returnValue(of(makeComment({ parentId: 'comment-1' })));
      component.submitReply('comment-1');
      expect(commentsSpy.addComment).toHaveBeenCalledWith('comment-1', 'Reply text', 'comment-1');
    });
  });

  describe('submitNewComment', () => {
    it('clears replyTargetId before submitting', () => {
      component.replyTargetId.set('some-id');
      component.newComment.set('New comment');
      commentsSpy.addComment.and.returnValue(of(makeComment({ parentId: 'doc-1' })));
      component.submitNewComment();
      expect(component.replyTargetId()).toBeNull();
    });
  });

  describe('isRepliesOpen', () => {
    it('returns false when not open', () => {
      expect(component.isRepliesOpen('comment-1')).toBeFalse();
    });

    it('returns true when opened', () => {
      component.openReplies.set({ 'comment-1': true });
      expect(component.isRepliesOpen('comment-1')).toBeTrue();
    });
  });

  describe('toggleReplies', () => {
    it('opens replies for a comment', () => {
      const comment = makeCommentNode({ id: 'c1' });
      component.toggleReplies(comment);
      expect(component.isRepliesOpen('c1')).toBeTrue();
    });

    it('toggles off when already open', () => {
      const comment = makeCommentNode({ id: 'c1' });
      component.openReplies.set({ c1: true });
      component.toggleReplies(comment);
      expect(component.isRepliesOpen('c1')).toBeFalse();
    });
  });

  describe('repliesCount', () => {
    it('returns children length when children exist', () => {
      const comment = makeCommentNode({
        id: 'c1',
        children: [makeCommentNode({ id: 'r1' }), makeCommentNode({ id: 'r2' })],
        numberOfReplies: 5,
      });
      expect(component.repliesCount(comment)).toBe(2);
    });

    it('returns numberOfReplies when no children', () => {
      const comment = makeCommentNode({ id: 'c1', numberOfReplies: 3 });
      expect(component.repliesCount(comment)).toBe(3);
    });

    it('returns 0 when no children and no numberOfReplies', () => {
      const comment = makeCommentNode({ id: 'c1' });
      expect(component.repliesCount(comment)).toBe(0);
    });
  });

  describe('toggleActionsMenu', () => {
    it('opens menu for new id', () => {
      component.toggleActionsMenu('c1');
      expect(component.actionsMenuOpenId()).toBe('c1');
    });

    it('closes menu when same id toggled again', () => {
      component.actionsMenuOpenId.set('c1');
      component.toggleActionsMenu('c1');
      expect(component.actionsMenuOpenId()).toBeNull();
    });

    it('switches to new id', () => {
      component.actionsMenuOpenId.set('c1');
      component.toggleActionsMenu('c2');
      expect(component.actionsMenuOpenId()).toBe('c2');
    });
  });

  describe('startEdit', () => {
    it('sets editingCommentId and editText', () => {
      const comment = makeCommentNode({ id: 'c1', text: 'Edit me' });
      component.startEdit(comment);
      expect(component.editingCommentId()).toBe('c1');
      expect(component.editText()).toBe('Edit me');
    });

    it('clears replyTargetId and actionsMenuOpenId', () => {
      component.replyTargetId.set('some-reply');
      component.actionsMenuOpenId.set('some-menu');
      const comment = makeCommentNode({ id: 'c1', text: 'x' });
      component.startEdit(comment);
      expect(component.replyTargetId()).toBeNull();
      expect(component.actionsMenuOpenId()).toBeNull();
    });
  });

  describe('cancelEdit', () => {
    it('clears editingCommentId and editText', () => {
      component.editingCommentId.set('c1');
      component.editText.set('some text');
      component.cancelEdit();
      expect(component.editingCommentId()).toBeNull();
      expect(component.editText()).toBe('');
    });
  });

  describe('saveEdit', () => {
    it('does nothing when editText is empty', () => {
      component.editingCommentId.set('c1');
      component.editText.set('');
      component.saveEdit();
      expect(commentsSpy.updateComment).not.toHaveBeenCalled();
    });

    it('calls updateComment and clears edit state', () => {
      component.editingCommentId.set('c1');
      component.editText.set('Updated text');
      commentsSpy.updateComment.and.returnValue(of(makeComment({ id: 'c1', text: 'Updated text' })));
      component.saveEdit();
      expect(commentsSpy.updateComment).toHaveBeenCalledWith('c1', 'doc-1', 'Updated text');
      expect(component.editingCommentId()).toBeNull();
    });

    it('sets errorMessage on failure', () => {
      component.editingCommentId.set('c1');
      component.editText.set('Edit text');
      commentsSpy.updateComment.and.returnValue(throwError(() => new Error('fail')));
      component.saveEdit();
      expect(component.errorMessage()).toBe('Kunde inte uppdatera kommentaren.');
    });
  });

  describe('requestDelete', () => {
    it('sets deleteTargetId', () => {
      const comment = makeCommentNode({ id: 'c1', text: 'Delete me' });
      component.requestDelete(comment);
      expect(component.deleteTargetId()).toBe('c1');
    });

    it('closes actionsMenu', () => {
      component.actionsMenuOpenId.set('c1');
      const comment = makeCommentNode({ id: 'c1', text: 'x' });
      component.requestDelete(comment);
      expect(component.actionsMenuOpenId()).toBeNull();
    });
  });

  describe('cancelDelete', () => {
    it('clears deleteTargetId and isDeleting', () => {
      component.deleteTargetId.set('c1');
      component.isDeleting.set(true);
      component.cancelDelete();
      expect(component.deleteTargetId()).toBeNull();
      expect(component.isDeleting()).toBeFalse();
    });
  });

  describe('confirmDelete', () => {
    it('does nothing when deleteTargetId is null', () => {
      component.deleteTargetId.set(null);
      component.confirmDelete();
      expect(commentsSpy.deleteComment).not.toHaveBeenCalled();
    });

    it('calls deleteComment and removes from comments tree', () => {
      component.deleteTargetId.set('c1');
      component.comments.set([
        { id: 'c1', parentId: 'doc-1', author: 'a', text: 'x', createdAt: new Date(), children: [] },
      ]);
      commentsSpy.deleteComment.and.returnValue(of(undefined));
      component.confirmDelete();
      expect(commentsSpy.deleteComment).toHaveBeenCalledWith('doc-1', 'c1');
      expect(component.comments().length).toBe(0);
    });

    it('sets errorMessage on delete failure', () => {
      component.deleteTargetId.set('c1');
      component.comments.set([
        { id: 'c1', parentId: 'doc-1', author: 'a', text: 'x', createdAt: new Date(), children: [] },
      ]);
      commentsSpy.deleteComment.and.returnValue(throwError(() => new Error('fail')));
      component.confirmDelete();
      expect(component.errorMessage()).toBe('Kunde inte radera kommentaren.');
    });
  });

  describe('startReply', () => {
    it('sets replyTargetId and clears replyText', () => {
      component.replyText.set('old text');
      component.startReply('comment-42');
      expect(component.replyTargetId()).toBe('comment-42');
      expect(component.replyText()).toBe('');
    });
  });

  describe('cancelReply', () => {
    it('clears replyTargetId and replyText', () => {
      component.replyTargetId.set('c1');
      component.replyText.set('reply text');
      component.cancelReply();
      expect(component.replyTargetId()).toBeNull();
      expect(component.replyText()).toBe('');
    });
  });

  describe('closeActionsMenuOnOutsideClick', () => {
    it('clears actionsMenuOpenId when click is outside', () => {
      component.actionsMenuOpenId.set('c1');
      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: document.body });
      component.closeActionsMenuOnOutsideClick(event);
      expect(component.actionsMenuOpenId()).toBeNull();
    });

    it('does nothing when no menu is open', () => {
      component.actionsMenuOpenId.set(null);
      const event = new MouseEvent('click');
      component.closeActionsMenuOnOutsideClick(event);
      expect(component.actionsMenuOpenId()).toBeNull();
    });
  });

  describe('with loaded comments', () => {
    beforeEach(() => {
      commentsSpy.getComments.and.callFake((id: string) => {
        if (id === 'doc-loaded') {
          return of(
            makeCommentList({
              entries: [
                makeComment({ id: 'root-1', parentId: 'doc-loaded', numberOfReplies: 0 }),
                makeComment({ id: 'root-2', parentId: 'doc-loaded', numberOfReplies: 0 }),
              ],
            })
          );
        }
        return of(makeCommentList());
      });
      fixture.componentRef.setInput('documentId', 'doc-loaded');
      fixture.detectChanges();
    });

    it('populates comments signal with root entries', () => {
      expect(component.comments().length).toBe(2);
    });

    it('comment IDs match entries', () => {
      const ids = component.comments().map(c => c.id);
      expect(ids).toContain('root-1');
      expect(ids).toContain('root-2');
    });
  });
});
