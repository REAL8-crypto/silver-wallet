import React, { useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  Typography,
  Stack
} from '@mui/material';
import { ContentCopy as CopyIcon, Check as CheckIcon, Visibility, VisibilityOff } from '@mui/icons-material';

interface PrivateKeyWarningDialogProps {
  open: boolean;

  // New (current parent usage)
  onClose?: () => void;
  secretKey?: string;
  showPrivateKey?: boolean;
  setShowPrivateKey?: React.Dispatch<React.SetStateAction<boolean>>;
  onCopySecret?: () => void;
  copiedSecret?: boolean;

  // Legacy (original component) — kept for backward compatibility
  onCancel?: () => void;
  onConfirm?: () => void;
}

/**
 * Backward-compatible dialog:
 * - Prefers new prop naming (onClose, secretKey handling, copy UX).
 * - Falls back to legacy onCancel/onConfirm if new handlers not provided.
 */
const PrivateKeyWarningDialog: React.FC<PrivateKeyWarningDialogProps> = ({
  open,
  onClose,
  secretKey = '',
  showPrivateKey = false,
  setShowPrivateKey,
  onCopySecret,
  copiedSecret = false,
  onCancel,
  onConfirm
}) => {
  // Normalize handlers
  const handleClose = onClose || onCancel || (() => {});
  const handleAcknowledge = onConfirm || handleClose;

  // Auto-hide logic responsibility is in parent (showPrivateKey timeout), so no timer here.
  // If desired, could be added locally, but keeping logic centralized avoids duplication.

  useEffect(() => {
    // If dialog closes, ensure we don't leave a revealed key (optional safety)
    if (!open && showPrivateKey && setShowPrivateKey) {
      setShowPrivateKey(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle color="error">Private Key Warning</DialogTitle>
      <DialogContent>
        <Alert severity="error" sx={{ mb: 2 }}>
          Never share your secret key. Anyone with it can control your funds.
        </Alert>

        <Typography variant="body2" paragraph>
          Make sure you are in a secure environment. Your key will auto-hide after 30 seconds.
        </Typography>

        {secretKey && (
          <Stack
            spacing={1.5}
            sx={{
              mt: 1.5,
              p: 2,
              border: '1px solid',
              borderColor: 'error.light',
              borderRadius: 2,
              bgcolor: 'error.lighter',
              background:
                'linear-gradient(135deg, rgba(244,67,54,0.08), rgba(244,67,54,0.02))'
            }}
          >
            {showPrivateKey ? (
              <Typography
                variant="caption"
                sx={{
                  fontFamily: 'monospace',
                  wordBreak: 'break-all',
                  userSelect: 'all'
                }}
              >
                {secretKey}
              </Typography>
            ) : (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontStyle: 'italic' }}
              >
                ••••••••••••••••••• (hidden)
              </Typography>
            )}

            <Stack direction="row" spacing={1} flexWrap="wrap">
              {setShowPrivateKey && (
                <Button
                  size="small"
                  variant="contained"
                  color={showPrivateKey ? 'warning' : 'primary'}
                  startIcon={showPrivateKey ? <VisibilityOff /> : <Visibility />}
                  onClick={() => setShowPrivateKey(!showPrivateKey)}
                >
                  {showPrivateKey ? 'Hide Key' : 'Show Key'}
                </Button>
              )}

              {onCopySecret && (
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  startIcon={copiedSecret ? <CheckIcon /> : <CopyIcon />}
                  onClick={onCopySecret}
                  disabled={copiedSecret || !secretKey || !showPrivateKey}
                >
                  {copiedSecret ? 'Copied' : 'Copy Key'}
                </Button>
              )}
            </Stack>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
        {!onClose && onConfirm && (
            <Button onClick={handleAcknowledge} color="error" variant="contained">
              I Understand
            </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default PrivateKeyWarningDialog;
