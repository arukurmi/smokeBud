'use client';
import { useState } from 'react';

export default function MoodNote({ onSubmit }: { onSubmit: (note: string) => void }) {
  const [note, setNote] = useState('');
  return (
    <div className="winddown-screen">
      <p className="eyebrow">before you go back inside</p>
      <p className="invite">how do you feel?</p>
      <input data-testid="mood-input" className="mood-input" maxLength={280}
        placeholder="one line, just for you" value={note}
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onSubmit(note); }} />
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button className="quiet" data-testid="mood-save" onClick={() => onSubmit(note)}>save</button>
        <button className="quiet" data-testid="mood-skip" onClick={() => onSubmit('')}>skip</button>
      </div>
    </div>
  );
}
