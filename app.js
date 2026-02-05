const { createApp, ref, onMounted } = Vue;

let ggwave = null;
let ggwaveInstance = null;
let audioContext = null;
let recorder = null;
let rafId = null;

// 初期化
(async () => {
  ggwave = await ggwave_factory();
})();

function init() {
  if (!audioContext) {
    audioContext = new AudioContext({ sampleRate: 48000 });

    const parameters = ggwave.getDefaultParameters();
    parameters.sampleRateInp = audioContext.sampleRate;
    parameters.sampleRateOut = audioContext.sampleRate;
    ggwaveInstance = ggwave.init(parameters);
  }
}

function convertTypedArray(src, type) {
  const buffer = new ArrayBuffer(src.byteLength);
  const baseView = new src.constructor(buffer).set(src);
  return new type(buffer);
}

const stream = ref(null);
const startMic = async () => {
  try {
    stream.value = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
  } catch (e) {
    console.error("マイク取得失敗", e);
  }
};

const stopMic = () => {
  if (!stream.value) return;

  stream.value.getTracks().forEach((track) => track.stop());
  stream.value = null;
};

const MODE = {
  SEND: "send",
  RECEIVE: "receive",
};
const receivedMessage = ref("");
const mode = ref(MODE.SEND);
const message = ref("");

createApp({
  setup() {
    const send = () => {
      if (!message.value.trim()) {
        return;
      }

      init();

      const waveform = ggwave.encode(
        ggwaveInstance,
        message.value,
        ggwave.ProtocolId.GGWAVE_PROTOCOL_AUDIBLE_FAST,
        10,
      );

      const buffer = audioContext.createBuffer(
        1,
        waveform.length,
        audioContext.sampleRate,
      );
      const buf = convertTypedArray(waveform, Float32Array);
      buffer.getChannelData(0).set(buf);

      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start();
    };

    const recieving = () => {
      mode.value = MODE.RECEIVE;
      init();

      navigator.mediaDevices
        .getUserMedia({
          audio: {
            echoCancellation: false,
            autoGainControl: false,
            noiseSuppression: false,
          },
        })
        .then((s) => {
          stream.value = s;
          const mediaStream = audioContext.createMediaStreamSource(
            stream.value,
          );

          const bufferSize = 1024;
          const numberOfInputChannels = 1;
          const numberOfOutputChannels = 1;

          if (audioContext.createScriptProcessor) {
            recorder = audioContext.createScriptProcessor(
              bufferSize,
              numberOfInputChannels,
              numberOfOutputChannels,
            );
          } else {
            recorder = audioContext.createJavaScriptNode(
              bufferSize,
              numberOfInputChannels,
              numberOfOutputChannels,
            );
          }

          recorder.onaudioprocess = function (e) {
            const source = e.inputBuffer;
            let res = ggwave.decode(
              ggwaveInstance,
              convertTypedArray(
                new Float32Array(source.getChannelData(0)),
                Int8Array,
              ),
            );

            if (res && res.length > 0) {
              res = new TextDecoder("utf-8").decode(res);

              if (!rafId) {
                rafId = requestAnimationFrame(() => {
                  receivedMessage.value = res;
                  rafId = null;
                });
              }
            }
          };

          mediaStream.connect(recorder);
          recorder.connect(audioContext.destination);
        });
    };

    onMounted(() => {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker
          .register("sw.js")
          .then(async (registration) => {})
          .catch((err) => {
            console.error("ServiceWorker registration failed: ", err);
          });
      }
    });

    return {
      mode,
      message,
      receivedMessage,
      send,
      recieving,
    };
  },
}).mount("#app");
