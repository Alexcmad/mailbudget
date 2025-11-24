import { useState, useEffect, useRef } from 'react';
import { Search, Loader, Mail, ChevronDown } from 'lucide-react';

interface DomainOption {
  domain: string;
  count: number;
  sampleSender: string;
}

interface DomainSearchDropdownProps {
  value: string;
  onChange: (domain: string) => void;
  onSearchDomains: () => Promise<DomainOption[]>;
  disabled?: boolean;
  placeholder?: string;
}

export default function DomainSearchDropdown({
  value,
  onChange,
  onSearchDomains,
  disabled = false,
  placeholder = 'Search or type email domain...',
}: DomainSearchDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [domains, setDomains] = useState<DomainOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initialize search query with current value
  useEffect(() => {
    setSearchQuery(value);
  }, [value]);

  const handleSearchClick = async () => {
    if (loading || disabled) return;

    setLoading(true);
    setIsOpen(true);
    try {
      const results = await onSearchDomains();
      setDomains(results);
      setHasSearched(true);
    } catch (error) {
      console.error('Failed to search domains:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);
    onChange(newValue);
  };

  const handleSelectDomain = (domain: string) => {
    setSearchQuery(domain);
    onChange(domain);
    setIsOpen(false);
  };

  const handleInputFocus = () => {
    if (hasSearched && domains.length > 0) {
      setIsOpen(true);
    }
  };

  // Filter domains based on search query
  const filteredDomains = domains.filter((d) =>
    d.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.sampleSender.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div ref={dropdownRef} className="relative">
      <div className="flex gap-2">
        {/* Search Input */}
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full px-4 py-2.5 pr-10 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-gray-800 placeholder:text-gray-400 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <ChevronDown
            className={`absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>

        {/* Search Button */}
        <button
          type="button"
          onClick={handleSearchClick}
          disabled={disabled || loading}
          className="px-4 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
        >
          {loading ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              Find Domains
            </>
          )}
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && hasSearched && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
          {filteredDomains.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              {searchQuery ? (
                <>
                  No domains found matching "<span className="font-semibold">{searchQuery}</span>".
                  <br />
                  You can still type it manually above.
                </>
              ) : (
                'No sender domains found in your recent emails.'
              )}
            </div>
          ) : (
            <div className="py-2">
              {filteredDomains.map((domainOption) => (
                <button
                  key={domainOption.domain}
                  type="button"
                  onClick={() => handleSelectDomain(domainOption.domain)}
                  className="w-full px-4 py-3 hover:bg-blue-50 transition-colors text-left flex items-start gap-3 group"
                >
                  <Mail className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 truncate">
                      {domainOption.domain}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {domainOption.sampleSender}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {domainOption.count} email{domainOption.count !== 1 ? 's' : ''}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
