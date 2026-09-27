const AuthPanel = ({ user, onSignIn, onSignOut }) => {
  return (
    <div className="auth-panel">
      {user ? (
        <>
          <div className="user-pill">
            <span className="user-avatar">{user.name?.charAt(0)?.toUpperCase() || 'U'}</span>
            <div>
              <strong>{user.name || 'Reeli user'}</strong>
              <small>{user.email || 'Signed in'}</small>
            </div>
          </div>
          <button type="button" onClick={onSignOut} className="auth-button secondary">
            Sign out
          </button>
        </>
      ) : (
        <button type="button" onClick={onSignIn} className="auth-button primary">
          Continue with Google
        </button>
      )}
    </div>
  );
};

export default AuthPanel;
