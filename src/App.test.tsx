import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders wallet app', () => {
  render(<App />);
  const walletElement = screen.getByText(/Billetera REAL8/i);
  expect(walletElement).toBeInTheDocument();
});
