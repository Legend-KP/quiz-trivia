/**
 * Wheel configuration for Spin the Wheel
 * All segments now award QT tokens
 */

export interface WheelOption {
  id: string;
  label: string;
  color: string;
  qtAmount: number;
  isToken: boolean;
}

export const wheelOptions: WheelOption[] = [
  { 
    id: '100_qt', 
    label: '100 QT', 
    color: '#FF6B6B',  // Red
    qtAmount: 100,
    isToken: true 
  },
  { 
    id: '200_qt', 
    label: '200 QT', 
    color: '#4ECDC4',  // Teal
    qtAmount: 200,
    isToken: true 
  },
  { 
    id: '500_qt', 
    label: '500 QT', 
    color: '#45B7D1',  // Blue
    qtAmount: 500,
    isToken: true 
  },
  { 
    id: '1000_qt', 
    label: '1K QT', 
    color: '#96CEB4',  // Green
    qtAmount: 1000,
    isToken: true 
  },
  { 
    id: '2000_qt', 
    label: '2K QT', 
    color: '#FFEAA7',  // Yellow
    qtAmount: 2000,
    isToken: true 
  },
  { 
    id: '10000_qt', 
    label: '10K QT', 
    color: '#DDA0DD',  // Purple
    qtAmount: 10000,
    isToken: true 
  }
];

export default wheelOptions;
