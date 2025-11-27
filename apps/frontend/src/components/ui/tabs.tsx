import * as React from "react"
import { cn } from "@/lib/utils"

const Tabs = ({ defaultValue, value, onValueChange, children, className }: {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}) => {
  const [internalActiveTab, setInternalActiveTab] = React.useState(defaultValue || '');

  const activeTab = value !== undefined ? value : internalActiveTab;
  const setActiveTab = onValueChange !== undefined ? onValueChange : setInternalActiveTab;

  return (
    <div className={className}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { activeTab, setActiveTab } as any);
        }
        return child;
      })}
    </div>
  );
};

const TabsList = ({ children, activeTab, setActiveTab, className }: any) => (
  <div className={cn("flex border-b border-gray-200 relative z-20", className)}>
    {React.Children.map(children, child => {
      if (React.isValidElement(child)) {
        return React.cloneElement(child, { activeTab, setActiveTab } as any);
      }
      return child;
    })}
  </div>
);

const TabsTrigger = ({ value, children, activeTab, setActiveTab, className, ...props }: any) => (
  <button
    type="button"
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      setActiveTab(value);
    }}
    className={cn(
      "px-4 py-2 text-sm font-medium transition-colors border-b-2 cursor-pointer relative z-10",
      activeTab === value
        ? "border-primary-600 text-primary-600"
        : "border-transparent text-gray-500 hover:text-gray-700",
      className
    )}
    {...props}
  >
    {children}
  </button>
);

const TabsContent = ({ value, children, activeTab }: any) => {
  if (value !== activeTab) return null;
  return <div className="mt-4">{children}</div>;
};

export { Tabs, TabsList, TabsTrigger, TabsContent };
