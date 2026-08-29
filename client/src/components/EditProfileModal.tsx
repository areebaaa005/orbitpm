import { useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export function EditProfileModal({ onClose }: { onClose: () => void }) {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      await updateProfile({ name: name.trim(), email: email.trim() });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Could not update your profile');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-sm rounded-xl2 bg-space-900 p-6 shadow-popover"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-lg font-semibold text-gray-100">Edit profile</h2>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">Full name</label>
              <input
                className="input-field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">Email</label>
              <input
                type="email"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={isSaving} className="btn-primary flex-1">
                {isSaving ? 'Saving…' : 'Save changes'}
              </button>
              <button type="button" onClick={onClose} className="btn-secondary flex-1">
                Cancel
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
