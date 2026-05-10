import { Mic } from 'lucide-react';

interface MicButtonProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}

export default function MicButton({ label = 'Note vocale', size = 'md', className = '', onClick }: MicButtonProps) {
  const sizeClasses = {
    sm: 'px-2 py-1 text-[11px]',
    md: 'px-3 py-1.5 text-xs',
    lg: 'px-4 py-2 text-sm',
  };
  const iconSize = { sm: 12, md: 14, lg: 16 };

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:border-rose/40 hover:bg-rose/5 transition-all ${sizeClasses[size]} ${className}`}
      title="Simulé — dictation → Whisper → structuration"
    >
      <Mic size={iconSize[size]} className="text-rose/80" />
      {size !== 'sm' && <span>{label}</span>}
      {size === 'sm' && <span className="hidden sm:inline">{label}</span>}
    </button>
  );
}
