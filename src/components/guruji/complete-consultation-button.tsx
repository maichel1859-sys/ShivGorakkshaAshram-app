"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CheckCircle,
  ChevronDown,
  Pill,
  SkipForward,
  Loader2
} from "lucide-react";

interface CompleteConsultationButtonProps {
  onPrescribeAndComplete: () => void;
  onSkipAndComplete: () => void;
  isLoading?: boolean;
  loadingText?: string;
  disabled?: boolean;
  size?: "sm" | "default" | "lg";
  className?: string;
}

export function CompleteConsultationButton({
  onPrescribeAndComplete,
  onSkipAndComplete,
  isLoading = false,
  loadingText = "Processing...",
  disabled = false,
  size = "default",
  className = ""
}: CompleteConsultationButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (isLoading) {
    return (
      <Button
        disabled
        size={size}
        className={`bg-green-600 hover:bg-green-700 ${className}`}
      >
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        {loadingText}
      </Button>
    );
  }

  return (
    <div className="flex items-center">
      {/* Main Complete Button */}
      <Button
        onClick={onPrescribeAndComplete}
        disabled={disabled}
        size={size}
        className={`bg-green-600 hover:bg-green-700 rounded-r-none border-r border-green-500 ${className}`}
      >
        <Pill className="h-4 w-4 mr-2" />
        Prescribe & Complete
      </Button>

      {/* Dropdown for alternative action */}
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            disabled={disabled}
            size={size}
            className={`bg-green-600 hover:bg-green-700 rounded-l-none px-2 border-l-0 ${className}`}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            onClick={onPrescribeAndComplete}
            className="flex items-center cursor-pointer"
          >
            <Pill className="h-4 w-4 mr-2 text-green-600" />
            <div>
              <p className="font-medium">Prescribe & Complete</p>
              <p className="text-xs text-muted-foreground">
                Add remedy prescription then complete
              </p>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onSkipAndComplete}
            className="flex items-center cursor-pointer"
          >
            <SkipForward className="h-4 w-4 mr-2 text-blue-600" />
            <div>
              <p className="font-medium">Skip & Complete</p>
              <p className="text-xs text-muted-foreground">
                Complete without prescription
              </p>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// Simple version for timer component
export function SimpleCompleteButton({
  onPrescribeAndComplete,
  onSkipAndComplete,
  isLoading = false,
  disabled = false,
  size = "sm",
  className = ""
}: Omit<CompleteConsultationButtonProps, 'loadingText'>) {
  const [isOpen, setIsOpen] = useState(false);

  if (isLoading) {
    return (
      <Button
        disabled
        size={size}
        variant="destructive"
        className={className}
      >
        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        Processing...
      </Button>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          disabled={disabled}
          size={size}
          variant="destructive"
          className={`flex items-center gap-1 ${className}`}
        >
          <CheckCircle className="h-3 w-3" />
          Complete
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem
          onClick={onPrescribeAndComplete}
          className="flex items-center cursor-pointer"
        >
          <Pill className="h-4 w-4 mr-2 text-green-600" />
          <div>
            <p className="font-medium text-sm">Prescribe & Complete</p>
            <p className="text-xs text-muted-foreground">
              Add remedy then complete
            </p>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onSkipAndComplete}
          className="flex items-center cursor-pointer"
        >
          <SkipForward className="h-4 w-4 mr-2 text-blue-600" />
          <div>
            <p className="font-medium text-sm">Skip & Complete</p>
            <p className="text-xs text-muted-foreground">
              Complete without prescription
            </p>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}