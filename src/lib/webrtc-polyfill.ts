// WebRTC polyfill for OpenAI Agents SDK
// This ensures WebRTC is properly available in all browser environments

if (typeof window !== 'undefined') {
  // Ensure RTCPeerConnection is available
  if (!window.RTCPeerConnection) {
    console.warn('RTCPeerConnection not available, attempting to polyfill...');
    
    // Try to get RTCPeerConnection from different sources
    const RTCPeerConnection = 
      window.RTCPeerConnection ||
      (window as any).webkitRTCPeerConnection ||
      (window as any).mozRTCPeerConnection;
    
    if (RTCPeerConnection) {
      window.RTCPeerConnection = RTCPeerConnection;
    } else {
      console.error('WebRTC is not supported in this browser');
    }
  }

  // Ensure RTCSessionDescription is available
  if (!window.RTCSessionDescription) {
    const RTCSessionDescription = 
      window.RTCSessionDescription ||
      (window as any).webkitRTCSessionDescription ||
      (window as any).mozRTCSessionDescription;
    
    if (RTCSessionDescription) {
      window.RTCSessionDescription = RTCSessionDescription;
    }
  }

  // Ensure RTCIceCandidate is available
  if (!window.RTCIceCandidate) {
    const RTCIceCandidate = 
      window.RTCIceCandidate ||
      (window as any).webkitRTCIceCandidate ||
      (window as any).mozRTCIceCandidate;
    
    if (RTCIceCandidate) {
      window.RTCIceCandidate = RTCIceCandidate;
    }
  }

  // Ensure getUserMedia is available
  if (!navigator.mediaDevices) {
    (navigator as any).mediaDevices = {};
  }

  if (!navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia = function(constraints) {
      const getUserMedia = 
        navigator.getUserMedia ||
        (navigator as any).webkitGetUserMedia ||
        (navigator as any).mozGetUserMedia ||
        (navigator as any).msGetUserMedia;

      if (!getUserMedia) {
        return Promise.reject(new Error('getUserMedia is not implemented in this browser'));
      }

      return new Promise((resolve, reject) => {
        getUserMedia.call(navigator, constraints, resolve, reject);
      });
    };
  }
}

export {};
