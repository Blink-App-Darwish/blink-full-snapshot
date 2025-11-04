import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  onAction,
  className = ""
}) {
  return (
    <Card className={`p-12 text-center ${className}`}>
      {Icon && <Icon className="w-16 h-16 mx-auto text-gray-300 mb-4" strokeWidth={1.5} />}
      <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 mb-6 max-w-sm mx-auto">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          className="bg-emerald-500 hover:bg-emerald-600"
        >
          {actionLabel}
        </Button>
      )}
    </Card>
  );
}