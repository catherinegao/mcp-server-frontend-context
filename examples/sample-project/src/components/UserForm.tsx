import { useState } from 'react';

interface UserFormProps {
  initialEmail?: string;
  onSubmit: (values: { name: string; email: string }) => void;
  onCancel?: () => void;
}

export function UserForm({ initialEmail = '', onSubmit, onCancel }: UserFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Name and email are required.');
      return;
    }
    setError(null);
    onSubmit({ name: name.trim(), email: email.trim() });
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label htmlFor="user-name">Name</label>
      <input
        id="user-name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoComplete="name"
      />

      <label htmlFor="user-email">Email</label>
      <input
        id="user-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
      />

      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}

      <div className="form-actions">
        <button type="submit">Save</button>
        {onCancel && (
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
