import { useState } from 'react';
import { X, ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

interface ModalOverlayProps {
  children: ReactNode;
  onClose: () => void;
}

export const ModalOverlay = ({ children, onClose }: ModalOverlayProps) => (
  <div 
    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
    onClick={onClose}
  >
    <div 
      className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 scale-100"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  </div>
);

interface ModalHeaderProps {
  title: string;
  onClose: () => void;
}

export const ModalHeader = ({ title, onClose }: ModalHeaderProps) => (
  <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white">
    <h3 className="text-lg font-bold text-gray-900">{title}</h3>
    <button 
      onClick={onClose} 
      className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-all"
    >
      <X className="w-5 h-5" />
    </button>
  </div>
);

interface ModalBodyProps {
  children: ReactNode;
}

export const ModalBody = ({ children }: ModalBodyProps) => (
  <div className="p-6 space-y-5 bg-white">
    {children}
  </div>
);

interface ModalFooterProps {
  children: ReactNode;
}

export const ModalFooter = ({ children }: ModalFooterProps) => (
  <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
    {children}
  </div>
);

interface InputGroupProps {
  label: string;
  children: ReactNode;
}

export const InputGroup = ({ label, children }: InputGroupProps) => (
  <div className="space-y-1.5">
    <label className="text-sm font-semibold text-gray-700 ml-1">{label}</label>
    {children}
  </div>
);

interface StyledInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const StyledInput = (props: StyledInputProps) => (
  <input 
    {...props}
    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-gray-800 placeholder:text-gray-400 bg-white"
  />
);

interface StyledSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: ReactNode;
}

export const StyledSelect = ({ children, className = '', ...props }: StyledSelectProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
        className="relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <select 
          {...props}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`styled-select w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gradient-to-b from-white to-gray-50/50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all duration-200 text-gray-800 font-medium appearance-none pr-12 cursor-pointer hover:border-gray-300 hover:shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
          style={{
            background: isFocused 
              ? 'linear-gradient(to bottom, white, rgb(219 234 254 / 0.3))'
              : isHovered
              ? 'linear-gradient(to bottom, white, rgb(249 250 251 / 0.5))'
              : 'linear-gradient(to bottom, white, rgb(249 250 251 / 0.5))'
          }}
        >
          {children}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
          <div 
            className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all duration-200 ${
              isFocused
                ? 'bg-blue-100/60 border-blue-300/50'
                : isHovered
                ? 'bg-gray-200/80 border-gray-300/50'
                : 'bg-gray-100/60 border-gray-200/50'
            }`}
          >
            <ChevronDown className={`w-4 h-4 transition-colors duration-200 ${
              isFocused ? 'text-blue-600' : 'text-gray-600'
            }`} />
          </div>
        </div>
      </div>
  );
};

interface StyledTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const StyledTextarea = (props: StyledTextareaProps) => (
  <textarea 
    {...props}
    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-gray-800 placeholder:text-gray-400 bg-white resize-none"
  />
);

interface StyledDateInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const StyledDateInput = (props: StyledDateInputProps) => (
  <input 
    {...props}
    type="date"
    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-gray-800 bg-white [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
  />
);

