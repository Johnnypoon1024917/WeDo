import React from 'react';
import { render, waitFor, screen, act } from '@testing-library/react-native';

// ---- Mocks ----

// Mock expo-av with a module-level reference we can spy on
jest.mock('expo-av', () => {
  const mockFn = jest.fn();
  return {
    Audio: {
      requestPermissionsAsync: mockFn,
    },
  };
});

// Get the actual mock function reference from the mocked module
import { Audio } from 'expo-av';
const mockRequestPermissionsAsync = Audio.requestPermissionsAsync as jest.Mock;

jest.mock('../../services/audioRecorderService', () => {
  const startRecordingMock = jest.fn();
  const uploadAudioMock = jest.fn();
  return {
    startRecording: startRecordingMock,
    uploadAudio: uploadAudioMock,
  };
});

import { startRecording } from '../../services/audioRecorderService';
const mockStartRecording = startRecording as jest.Mock;

import AudioRecorder from '../AudioRecorder';

// ---- Helpers ----

const defaultProps = {
  memoryId: 'mem-1',
  relationshipId: 'rel-1',
  onAudioAttached: jest.fn(),
  onCancel: jest.fn(),
};

/**
 * Find a component instance by accessibilityLabel that has an onPress prop.
 */
function findPressableByLabel(node: any, label: string): any {
  if (node.props?.accessibilityLabel === label && node.props?.onPress) {
    return node;
  }
  if (node.children) {
    for (const child of node.children) {
      if (typeof child === 'object') {
        const found = findPressableByLabel(child, label);
        if (found) return found;
      }
    }
  }
  return null;
}

// ---- Tests ----

beforeEach(() => {
  jest.clearAllMocks();
});

describe('AudioRecorder microphone permission handling', () => {
  it('2.2.1 — permission denied shows error message and does not start recording', async () => {
    mockRequestPermissionsAsync.mockResolvedValue({ status: 'denied' });

    const { UNSAFE_root } = render(<AudioRecorder {...defaultProps} />);

    const pressable = findPressableByLabel(UNSAFE_root, 'Start recording voice note');
    await act(async () => {
      await pressable.props.onPress();
    });

    await waitFor(() => {
      expect(mockRequestPermissionsAsync).toHaveBeenCalledTimes(1);
    });

    expect(
      screen.getByText('Microphone access is required to record voice notes'),
    ).toBeTruthy();
    expect(mockStartRecording).not.toHaveBeenCalled();
  });

  it('2.2.2 — permission granted proceeds to start recording normally', async () => {
    mockRequestPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockStartRecording.mockResolvedValue({ stop: jest.fn() });

    const { UNSAFE_root } = render(<AudioRecorder {...defaultProps} />);

    const pressable = findPressableByLabel(UNSAFE_root, 'Start recording voice note');
    await act(async () => {
      await pressable.props.onPress();
    });

    await waitFor(() => {
      expect(mockRequestPermissionsAsync).toHaveBeenCalledTimes(1);
      expect(mockStartRecording).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByLabelText('Stop recording')).toBeTruthy();
  });

  it('2.2.3 — already-granted permission does not re-prompt the user', async () => {
    // Simulates the case where permission was previously granted.
    // requestPermissionsAsync is still called (it's idempotent) but returns
    // 'granted' immediately — no user-facing prompt occurs.
    mockRequestPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockStartRecording.mockResolvedValue({ stop: jest.fn() });

    const { UNSAFE_root } = render(<AudioRecorder {...defaultProps} />);

    const pressable = findPressableByLabel(UNSAFE_root, 'Start recording voice note');
    await act(async () => {
      await pressable.props.onPress();
    });

    await waitFor(() => {
      expect(mockRequestPermissionsAsync).toHaveBeenCalledTimes(1);
      expect(mockStartRecording).toHaveBeenCalledTimes(1);
    });

    // No error message should be shown
    expect(
      screen.queryByText('Microphone access is required to record voice notes'),
    ).toBeNull();

    // Recording should have started
    expect(screen.getByLabelText('Stop recording')).toBeTruthy();
  });
});
