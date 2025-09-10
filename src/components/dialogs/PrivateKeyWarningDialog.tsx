import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Alert, Typography
} from '@mui/material';

interface PrivateKeyWarningDialogProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const PrivateKeyWarningDialog: React.FC<PrivateKeyWarningDialogProps> = ({
  open, onCancel, onConfirm
}) => {
  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="sm">
      <DialogTitle color="error">Private Key Warning</DialogTitle>
      <DialogContent>
        <Alert severity="error" sx={{ mb: 2 }}>
          Never share your secret key. Anyone with it can control your funds.
        </Alert>
        <Typography variant="body2">
          Make sure you are in a secure environment. Your key will auto-hide after 30 seconds.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button onClick={onConfirm} variant="contained" color="error">
          I Understand
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PrivateKeyWarningDialog;