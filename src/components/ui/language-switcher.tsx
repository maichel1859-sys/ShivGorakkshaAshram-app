'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Globe, Check, Languages } from 'lucide-react';
import { cn } from '@/lib/utils/helpers';
import { useLanguage, SUPPORTED_LANGUAGES } from '@/contexts/LanguageContext';

interface LanguageSwitcherProps {
  variant?: 'default' | 'compact';
  showFlag?: boolean;
  showBadge?: boolean;
  className?: string;
}

export function LanguageSwitcher({ 
  variant = 'default', 
  showFlag = true,
  showBadge = false,
  className 
}: LanguageSwitcherProps) {
  const { currentLanguage, changeLanguage, isLoading } = useLanguage();

  const getCurrentLanguageObj = () => {
    return SUPPORTED_LANGUAGES.find(
      (lang) => lang.code === currentLanguage
    ) || SUPPORTED_LANGUAGES[0];
  };

  const currentLangObj = getCurrentLanguageObj();

  if (isLoading) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <Globe className="h-5 w-5 animate-pulse" />
      </Button>
    );
  }

  if (variant === 'compact') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn(
              "relative transition-all duration-200",
              className
            )}
          >
            {showFlag ? (
              <span className="text-lg">{currentLangObj.flag}</span>
            ) : (
              <Globe className="h-5 w-5 text-primary" />
            )}
            {showBadge && (
              <Badge 
                variant="secondary" 
                className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs bg-primary text-primary-foreground"
              >
                {currentLangObj.code.toUpperCase()}
              </Badge>
            )}
            <span className="sr-only">Change language</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 rounded-xl border-border/50 shadow-lg">
          <div className="p-2 text-xs text-muted-foreground border-b">
            <Languages className="h-3 w-3 inline mr-1" />
            Choose Language • भाषा चुनें • भाषा निवडा
          </div>
          {SUPPORTED_LANGUAGES.map((language) => (
            <DropdownMenuItem
              key={language.code}
              onClick={() => changeLanguage(language.code)}
              className={cn(
                "flex items-center justify-between p-3 cursor-pointer transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                currentLangObj.code === language.code && 
                "bg-accent text-accent-foreground"
              )}
            >
              <div className="flex items-center space-x-3">
                {showFlag && <span className="text-lg">{language.flag}</span>}
                <div>
                  <span className="text-sm font-medium">{language.nativeName}</span>
                  <div className="text-xs text-muted-foreground">{language.name}</div>
                </div>
              </div>
              {currentLangObj.code === language.code && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className={cn(
            "gap-2 transition-colors duration-200",
            className
          )}
        >
          <Languages className="h-4 w-4 text-primary" />
          {showFlag && <span>{currentLangObj.flag}</span>}
          <span className="hidden sm:inline font-medium">{currentLangObj.nativeName}</span>
          <span className="sm:hidden font-medium">{currentLangObj.code.toUpperCase()}</span>
          {showBadge && (
            <Badge 
              variant="secondary" 
              className="text-xs"
            >
              {currentLangObj.code.toUpperCase()}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 rounded-xl border-border/50 shadow-lg">
        <div className="p-3 border-b">
          <div className="flex items-center space-x-2 text-sm font-medium text-primary">
            <Languages className="h-4 w-4" />
            <span>Select Language</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Choose your preferred language • अपनी भाषा चुनें • तुमची भाषा निवडा
          </p>
        </div>
        {SUPPORTED_LANGUAGES.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => changeLanguage(language.code)}
            className={cn(
              "flex items-center justify-between p-4 cursor-pointer",
              "hover:bg-accent hover:text-accent-foreground transition-colors",
              currentLangObj.code === language.code && 
              "bg-accent text-accent-foreground"
            )}
          >
            <div className="flex items-center space-x-4">
              <span className="text-2xl">{language.flag}</span>
              <div className="flex flex-col">
                <span className="text-sm font-semibold">{language.nativeName}</span>
                <span className="text-xs text-muted-foreground">{language.name}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge 
                variant="outline" 
                className="text-xs"
              >
                {language.code.toUpperCase()}
              </Badge>
              {currentLangObj.code === language.code && (
                <Check className="h-5 w-5 text-primary" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
        <div className="p-3 border-t bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            ShivGoraksha Ashram
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { SUPPORTED_LANGUAGES };