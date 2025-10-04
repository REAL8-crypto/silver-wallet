import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Fade,
  Paper,
  Tooltip
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import real8Logo from '../assets/Logo-REAL8-512x512.png';

interface SplashScreenProps {
  onLanguageSelected: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onLanguageSelected }) => {
  const { i18n } = useTranslation();
  const [fadeOut, setFadeOut] = useState(false);

  const handleLanguageSelection = (language: string) => {
    i18n.changeLanguage(language);
    // Mark that user has completed the splash screen
    localStorage.setItem('real8_splash_completed', 'true');
    setFadeOut(true);
    // Delay the callback to allow fade animation to complete
    setTimeout(() => {
      onLanguageSelected();
    }, 500);
  };

  return (
    <Fade in={!fadeOut} timeout={500}>
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Background decorative elements */}
        <Box
          sx={{
            position: 'absolute',
            top: '10%',
            left: '10%',
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            background: 'linear-gradient(45deg, rgba(25, 118, 210, 0.1), rgba(220, 0, 78, 0.1))',
            filter: 'blur(40px)',
            animation: 'float 6s ease-in-out infinite'
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: '20%',
            right: '15%',
            width: '150px',
            height: '150px',
            borderRadius: '50%',
            background: 'linear-gradient(45deg, rgba(220, 0, 78, 0.15), rgba(25, 118, 210, 0.15))',
            filter: 'blur(30px)',
            animation: 'float 4s ease-in-out infinite reverse'
          }}
        />

        {/* Main content container */}
        <Paper
          elevation={8}
          sx={{
            borderRadius: 4,
            p: { xs: 4, sm: 6, md: 8 },
            textAlign: 'center',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            maxWidth: { xs: '500px', md: '900px' },
            width: '100%',
            mx: 2
          }}
        >
          {/* REAL8 Logo - Mobile only */}
          <Box
            sx={{
              mb: 4,
              position: 'relative',
              display: { xs: 'block', md: 'none' }
            }}
          >
            <Box
              component="img"
              src={real8Logo}
              alt="REAL8 Logo"
              sx={{
                width: 185,
                height: 185,
                objectFit: 'contain',
                filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.1))',
                transition: 'transform 0.3s ease',
                '&:hover': {
                  transform: 'scale(1.05)'
                }
              }}
            />
            {/* Subtle glow effect behind logo */}
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 205,
                height: 205,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(25, 118, 210, 0.1) 0%, transparent 70%)',
                zIndex: -1,
                animation: 'pulse 3s ease-in-out infinite'
              }}
            />
          </Box>

          <Typography
            variant="body1"
            color="text.secondary"
            sx={{
              mb: 4,
              fontSize: { xs: '1rem', sm: '1.1rem' },
              maxWidth: '300px',
              mx: 'auto',
              lineHeight: 1.6,
              display: { xs: 'block', md: 'none' } // Only show on mobile
            }}
          >
            Select your language to continue
            <br />
            Selecciona tu idioma para continuar
          </Typography>

          {/* Mobile Layout: Stacked vertically */}
          <Box
            sx={{
              display: { xs: 'flex', md: 'none' },
              justifyContent: 'center',
              alignItems: 'center',
              gap: 4
            }}
          >
            {/* English Flag - First on mobile */}
            <Box sx={{ textAlign: 'center' }}>
              <Tooltip title="English" placement="top">
                <IconButton
                  onClick={() => handleLanguageSelection('en')}
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
                    },
                    '&:active': {
                      transform: 'translateY(-2px)'
                    }
                  }}
                >
                  <Typography
                    component="span"
                    sx={{
                      fontSize: 40,
                      lineHeight: 1,
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                    }}
                  >
                    🇺🇸
                  </Typography>
                </IconButton>
              </Tooltip>
              <Typography
                variant="body2"
                sx={{
                  mt: 1,
                  fontWeight: 600,
                  color: 'text.secondary'
                }}
              >
                English
              </Typography>
            </Box>

            {/* Divider */}
            <Box
              sx={{
                width: '1px',
                height: '60px',
                background: 'linear-gradient(to bottom, transparent, #ccc, transparent)'
              }}
            />

            {/* Spanish Flag - Second on mobile */}
            <Box sx={{ textAlign: 'center' }}>
              <Tooltip title="Español" placement="top">
                <IconButton
                  onClick={() => handleLanguageSelection('es')}
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
                    },
                    '&:active': {
                      transform: 'translateY(-2px)'
                    }
                  }}
                >
                  <Typography
                    component="span"
                    sx={{
                      fontSize: 40,
                      lineHeight: 1,
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                    }}
                  >
                    🇪🇸
                  </Typography>
                </IconButton>
              </Tooltip>
              <Typography
                variant="body2"
                sx={{
                  mt: 1,
                  fontWeight: 600,
                  color: 'text.secondary'
                }}
              >
                Español
              </Typography>
            </Box>
          </Box>

          {/* Desktop Layout: Logo in center, flags on sides */}
          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              width: '100%'
            }}
          >
            {/* English Flag - Left side on desktop */}
            <Box 
              sx={{ 
                textAlign: 'center',
                flex: '0 0 auto'
              }}
            >
              <Tooltip title="English" placement="top">
                <IconButton
                  onClick={() => handleLanguageSelection('en')}
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
                    },
                    '&:active': {
                      transform: 'translateY(-2px)'
                    }
                  }}
                >
                  <Typography
                    component="span"
                    sx={{
                      fontSize: 60,
                      lineHeight: 1,
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                    }}
                  >
                    🇺🇸
                  </Typography>
                </IconButton>
              </Tooltip>
              <Typography
                variant="body1"
                sx={{
                  mt: 1,
                  fontWeight: 700,
                  color: 'text.primary',
                  fontSize: '1.1rem'
                }}
              >
                English
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  fontSize: '0.9rem'
                }}
              >
                Select your language
              </Typography>
            </Box>

            {/* Logo in center for desktop */}
            <Box
              sx={{
                textAlign: 'center',
                flex: '0 0 auto',
                position: 'relative'
              }}
            >
              <Box
                component="img"
                src={real8Logo}
                alt="REAL8 Logo"
                sx={{
                  width: 350,
                  height: 350,
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.1))',
                  transition: 'transform 0.3s ease',
                  '&:hover': {
                    transform: 'scale(1.05)'
                  }
                }}
              />
              {/* Subtle glow effect behind logo */}
              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 370,
                  height: 370,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(25, 118, 210, 0.1) 0%, transparent 70%)',
                  zIndex: -1,
                  animation: 'pulse 3s ease-in-out infinite'
                }}
              />
            </Box>

            {/* Spanish Flag - Right side on desktop */}
            <Box 
              sx={{ 
                textAlign: 'center',
                flex: '0 0 auto'
              }}
            >
              <Tooltip title="Español" placement="top">
                <IconButton
                  onClick={() => handleLanguageSelection('es')}
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
                    },
                    '&:active': {
                      transform: 'translateY(-2px)'
                    }
                  }}
                >
                  <Typography
                    component="span"
                    sx={{
                      fontSize: 60,
                      lineHeight: 1,
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                    }}
                  >
                    🇪🇸
                  </Typography>
                </IconButton>
              </Tooltip>
              <Typography
                variant="body1"
                sx={{
                  mt: 1,
                  fontWeight: 700,
                  color: 'text.primary',
                  fontSize: '1.1rem'
                }}
              >
                Español
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  fontSize: '0.9rem'
                }}
              >
                Selecciona tu idioma
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* CSS-in-JS animations */}
        <style>
          {`
            @keyframes float {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-20px); }
            }
            @keyframes pulse {
              0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); }
              50% { opacity: 0.8; transform: translate(-50%, -50%) scale(1.1); }
            }
          `}
        </style>
      </Box>
    </Fade>
  );
};

export default SplashScreen;
