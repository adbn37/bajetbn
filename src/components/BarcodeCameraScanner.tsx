import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { getErrorMessage } from '../utils/errors';

interface BarcodeCameraScannerProps {
  startLabel: string;
  disabled?: boolean;
  onDetected: (barcode: string) => void | Promise<void>;
  onError: (message: string) => void;
}

export function BarcodeCameraScanner({ startLabel, disabled = false, onDetected, onError }: BarcodeCameraScannerProps) {
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const handledRef = useRef(false);

  const stop = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setScanning(false);
  }, []);

  useEffect(() => stop, [stop]);

  const start = async () => {
    if (disabled || scanning) return;
    onError('');
    handledRef.current = false;
    setScanning(true);
    try {
      const hints = new Map<DecodeHintType, unknown>();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.AZTEC,
        BarcodeFormat.CODABAR,
        BarcodeFormat.CODE_39,
        BarcodeFormat.CODE_93,
        BarcodeFormat.CODE_128,
        BarcodeFormat.DATA_MATRIX,
        BarcodeFormat.EAN_8,
        BarcodeFormat.EAN_13,
        BarcodeFormat.ITF,
        BarcodeFormat.MAXICODE,
        BarcodeFormat.MICRO_QR_CODE,
        BarcodeFormat.PDF_417,
        BarcodeFormat.QR_CODE,
        BarcodeFormat.RSS_14,
        BarcodeFormat.RSS_EXPANDED,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);
      const reader = new BrowserMultiFormatReader(hints, {
        delayBetweenScanAttempts: 180,
        delayBetweenScanSuccess: 800,
      });
      const controls = await reader.decodeFromConstraints(
        {
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        videoRef.current || undefined,
        (result, _scanError, activeControls) => {
          if (!result || handledRef.current) return;
          handledRef.current = true;
          activeControls.stop();
          controlsRef.current = null;
          setScanning(false);
          void onDetected(result.getText());
        },
      );
      controlsRef.current = controls;
      try {
        await controls.streamVideoConstraintsApply?.({
          advanced: [{ focusMode: 'continuous' }],
        } as unknown as MediaTrackConstraints);
      } catch {
        // Continuous autofocus is optional and unavailable on some cameras.
      }
    } catch (error) {
      setScanning(false);
      onError(`Camera could not start. ${getErrorMessage(error)} You can enter the barcode manually instead.`);
    }
  };

  return <div className="barcode-camera-scanner">
    <div className="button-row">
      {!scanning && <button className="button primary" type="button" disabled={disabled} onClick={() => void start()}>{startLabel}</button>}
      {scanning && <button className="button secondary" type="button" onClick={stop}>Stop camera</button>}
    </div>
    <video ref={videoRef} className={`collection-scanner-video ${scanning ? 'active' : ''}`} muted playsInline />
  </div>;
}
