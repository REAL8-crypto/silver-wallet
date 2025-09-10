import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, Button, Box
} from '@mui/material';
import { Check as CheckIcon, ContentCopy as ContentCopyIcon } from '@mui/icons-material';

interface ReceiveDialogProps {
  open: boolean;
  onClose: () => void;
  publicKey: string | null;
  qrCodeUrl: string;
  onCopy: () => void;
  copied: boolean;
  generating: boolean;
}

const ReceiveDialog: React.FC<ReceiveDialogProps> = ({
  open, onClose, publicKey, qrCodeUrl, onCopy, copied, generating
}) => {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Receive</DialogTitle>
      <DialogContent>
        <Typography variant="body2" paragraph>
          Share this address to receive assets:
        </Typography>
        <Box
          sx={{
            p: 2,
            bgcolor: 'background.paper',
            borderRadius: 1,
            textAlign: 'center'
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontFamily: 'monospace',
              wordBreak: 'break-all',
              display: 'block',
              mb: 1
            }}
          >
            {publicKey}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />}
            onClick={onCopy}
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </Box>
        <Typography
          variant="body2"
            sx={{ mt: 2, textAlign: 'center' }}
        >
          Scan QR Code
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          {!generating && qrCodeUrl ? (
            <img
              src={qrCodeUrl}
              alt="QR Code"
              style={{
                width: 200,
                height: 200,
                border: '1px solid #ddd',
                borderRadius: 8
              }}
            />
          ) : (
            <Box
              sx={{
                width: 200,
                height: 200,
                bgcolor: '#f5f5f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Typography color="textSecondary" variant="caption">
                {generating ? 'Generating...' : 'No QR'}
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReceiveDialog;