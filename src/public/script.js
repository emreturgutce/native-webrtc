const userVideo = document.getElementById('user-video');
const partnerVideo = document.getElementById('partner-video');
let socket;
let otherUser;
let peer;
let userStream;

navigator.mediaDevices
  .getUserMedia({ audio: true, video: true })
  .then(stream => {
    userVideo.srcObject = stream;
    userStream = stream;

    socket = io();

    socket.emit('join room', roomId);

    socket.on('other user', userId => {
      callUser(userId);
      otherUser = userId;
    });

    socket.on('user joined', userID => {
      otherUser = userID;
    });

    socket.on('offer', handleRecieveCall);

    socket.on('answer', handleAnswer);

    socket.on('ice-candidate', handleNewICECandidateMsg);
  });

function callUser(userID) {
  peer = createPeer(userID);
  userStream.getTracks().forEach(track => peer.addTrack(track, userStream));
}

function createPeer(userID) {
  const peer = new RTCPeerConnection({
    iceServers: [
      {
        urls: 'stun:stun.stunprotocol.org',
      },
      {
        urls: 'turn:numb.viagenie.ca',
        credential: 'muazkh',
        username: 'webrtc@live.com',
      },
    ],
  });

  peer.onicecandidate = handleICECandidateEvent;
  peer.ontrack = handleTrackEvent;
  peer.onnegotiationneeded = () => handleNegotiationNeededEvent(userID);

  return peer;
}

function handleTrackEvent(e) {
  partnerVideo.srcObject = e.streams[0];
}

function handleRecieveCall(incoming) {
  peer = createPeer();
  const desc = new RTCSessionDescription(incoming.sdp);
  peer
    .setRemoteDescription(desc)
    .then(() => {
      userStream.getTracks().forEach(track => peer.addTrack(track, userStream));
    })
    .then(() => {
      return peer.createAnswer();
    })
    .then(answer => {
      return peer.setLocalDescription(answer);
    })
    .then(() => {
      const payload = {
        target: incoming.caller,
        caller: socket.id,
        sdp: peer.localDescription,
      };
      socket.emit('answer', payload);
    });
}

function handleAnswer(message) {
  const desc = new RTCSessionDescription(message.sdp);
  peer.setRemoteDescription(desc).catch(e => console.log(e));
}

function handleNewICECandidateMsg(incoming) {
  const candidate = new RTCIceCandidate(incoming);

  peer.addIceCandidate(candidate).catch(e => console.log(e));
}

function handleICECandidateEvent(e) {
  if (e.candidate) {
    const payload = {
      target: otherUser,
      candidate: e.candidate,
    };
    socket.emit('ice-candidate', payload);
  }
}

function handleNegotiationNeededEvent(userID) {
  peer
    .createOffer()
    .then(offer => {
      return peer.setLocalDescription(offer);
    })
    .then(() => {
      const payload = {
        target: userID,
        caller: socket.id,
        sdp: peer.localDescription,
      };
      socket.emit('offer', payload);
    })
    .catch(e => console.log(e));
}
