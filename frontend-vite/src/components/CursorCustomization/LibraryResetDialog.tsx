import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';

interface LibraryResetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReset: () => void;
}

export function LibraryResetDialog({
  open,
  onOpenChange,
  onReset
}: LibraryResetDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogTrigger asChild>
        <Button
          id="reset-library-btn"
          variant="destructive"
          className="sm:w-auto rounded-full"
        >
          Reset Library
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset Library</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to reset your library?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4 space-y-4">
          <div>
            <p className="text-sm font-medium text-foreground mb-2">Warning: This action cannot be undone.</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-red-600 dark:text-red-400">
              <li>All cursors you created and added to the Library will be deleted.</li>
              <li>Your library will be reset back to default cursors only.</li>
            </ul>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onReset}
          >
            Reset Library
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
