import { Mic } from 'lucide-react';

interface MicButtonProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function MicButton({ label = 'Enregistrer une note audio', size = 'md', className = '' }: MicButtonProps) {
  const sizeClasses = {
    sm: 'p-1.5',
    md: 'px-3 py-2',
    lg: 'px-4 py-3',
  };
  const iconSize = { sm: 14, md: 16, lg: 20 };

  return (
    <button
      className={`inline-flex items-center gap-2 rounded-lg border border-rose/30 bg-rose/5 text-rose hover:bg-rose/10 hover:border-rose/50 transition-all cursor-not-allowed ${sizeClasses[size]} ${className}`}
      title="Simulé — future connexion audio"
    >
      <Mic size={iconSize[size]} className="animate-pulse-glow" />
      {size !== 'sm' && <span className="text-xs font-mono">{label}</span>}
    </button>
  );
}
