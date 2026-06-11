import { useState } from 'react';
import { Button } from './components/Button.js';
import { Modal } from './components/Modal.js';
import { UserForm } from './components/UserForm.js';

export function App() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <main className="app">
      <h1>Sample Project</h1>
      <p>
        This sample project exists so the MCP server has a real codebase to scan
        when running tests and demos.
      </p>

      <Button label="Open form" onClick={() => setIsOpen(true)} />

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="New user">
        <UserForm
          onSubmit={() => setIsOpen(false)}
          onCancel={() => setIsOpen(false)}
        />
      </Modal>
    </main>
  );
}
