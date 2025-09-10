import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  Stack
} from '@mui/material';
import {
  Check as CheckIcon,
  ContentCopy as ContentCopyIcon,
  Autorenew as RefreshIcon
} from '@mui/icons-material';

interface ReceiveDialogProps {
  open: boolean;
  onClose: () => void;
  publicKey: string | null;
  qrCodeUrl: string;
  // Legacy prop set
  onCopy?: () => void;
  copied?: boolean;
  generating?: boolean;
  // New prop set
  onCopyAddress?: () => void;
  copiedAddress?: boolean;
  generateQr?: () => void;
  qrGenerating?: boolean;
}

const ReceiveDialog: React.FC<ReceiveDialogProps> = ({
  open,
  onClose,
  publicKey,
  qrCodeUrl,
  onCopy,
  copied,
  generating,
  onCopyAddress,
  copiedAddress,
  generateQr,
  qrGenerating
}) => {
  // Normalize to unified variables
  const handleCopy = onCopyAddress || onCopy || (() => {});
  const isCopied = copiedAddress ?? copied ?? false;
  const handleGenerate = generateQr || (() => {});
  const isGenerating = qrGenerating ?? generating ?? false;

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
          <Stack
            direction="row"
            spacing={1}
            justifyContent="center"
            flexWrap="wrap"
            sx={{ mt: 0.5 }}
          >
            <Button
              size="small"
              variant="outlined"
              startIcon={isCopied ? <CheckIcon /> : <ContentCopyIcon />}
              onClick={handleCopy}
              disabled={isCopied}
            >
              {isCopied ? 'Copied' : 'Copy'}
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? 'Generating...' : qrCodeUrl ? 'Regenerate QR' : 'Generate QR'}
            </Button>
          </Stack>
        </Box>

        <Typography
          variant="body2"
          sx={{ mt: 2, textAlign: 'center' }}
        >
          Scan QR Code
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          {!isGenerating && qrCodeUrl ? (
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
                justifyContent: 'center',
                borderRadius: 1,
                border: '1px solid #e0e0e0'
              }}
            >
              <Typography color="textSecondary" variant="caption">
                {isGenerating ? 'Generating...' : 'No QR'}
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="text">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReceiveDialog;
