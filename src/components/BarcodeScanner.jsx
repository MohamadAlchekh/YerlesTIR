import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const BarcodeScanner = ({ onResult, onClose }) => {
  const scannerRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    let scanner = null;

    // React 18 Strict Mode fix: Delay initialization slightly to bypass the rapid mount-unmount cycle
    const timeoutId = setTimeout(() => {
      if (!isMounted) return;

      const el = document.getElementById("qr-reader");
      if (el) el.innerHTML = ""; // Clear any leftovers

      scanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      scanner.render(
        (decodedText) => {
          if (isMounted) {
            onResult(decodedText);
            if (scanner) scanner.clear();
          }
        },
        (error) => {
          // ignore
        }
      );
    }, 100);

    // Cleanup
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      if (scanner) {
        scanner.clear().catch(error => {
          console.error("Failed to clear html5QrcodeScanner. ", error);
        });
      }
    };
  }, [onResult]);

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '2rem'
    }}>
      <div style={{
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        borderRadius: '16px',
        padding: '2rem',
        maxWidth: '500px',
        width: '100%',
        boxShadow: 'var(--card-shadow)'
      }}>
        <style>
          {`
            #qr-reader {
              border: none !important;
              background: transparent !important;
            }
            #qr-reader__dashboard_section_csr span, #qr-reader__dashboard_section_swaplink {
              color: var(--text-main) !important;
              font-family: 'Inter', sans-serif !important;
              font-size: 0.9rem !important;
            }
            #qr-reader button, 
            #qr-reader input[type="button"], 
            #qr-reader input[type="file"]::-webkit-file-upload-button {
              background-color: rgba(37, 150, 190, 1) !important;
              color: white !important;
              border: none !important;
              padding: 0.6rem 1.2rem !important;
              border-radius: 8px !important;
              cursor: pointer !important;
              font-family: 'Inter', sans-serif !important;
              font-weight: 600 !important;
              margin: 0.5rem !important;
              transition: all 0.2s !important;
              box-shadow: none !important;
            }
            #qr-reader button:hover,
            #qr-reader input[type="button"]:hover {
              background-color: rgba(37, 150, 190, 0.8) !important;
            }
            #qr-reader a {
              color: #60a5fa !important;
              text-decoration: none !important;
            }
            #qr-reader select {
              background: rgba(0,0,0,0.5) !important;
              color: white !important;
              border: 1px solid rgba(255,255,255,0.2) !important;
              padding: 0.5rem !important;
              border-radius: 8px !important;
              margin-bottom: 1rem !important;
              outline: none !important;
            }
            #qr-reader__scan_region {
              border-radius: 12px !important;
              overflow: hidden !important;
            }
            #qr-reader__dashboard_section_csr {
              margin-bottom: 1rem !important;
            }
          `}
        </style>
        <h3 style={{ color: 'white', marginBottom: '1rem', textAlign: 'center' }}>Barkod / QR Kod Okutun</h3>
        <div id="qr-reader" style={{ width: '100%', borderRadius: '8px', overflow: 'hidden' }}></div>
        <button 
          className="btn" 
          style={{ width: '100%', marginTop: '1.5rem', backgroundColor: 'rgba(37, 150, 190, 1)', borderColor: 'rgba(37, 150, 190, 1)', color: 'white' }} 
          onClick={onClose}
        >
          İptal Et / Kapat
        </button>
      </div>
    </div>
  );
};

export default BarcodeScanner;
