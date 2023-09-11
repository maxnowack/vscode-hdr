// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
window.origRequire = window.require;

function enable() {
  const videoElement = document.createElement('video');
  videoElement.setAttribute('id', 'hdr-video-overlay');
  videoElement.setAttribute('autoplay', '');
  videoElement.setAttribute('loop', '');
  videoElement.setAttribute('muted', '');

  // style
  videoElement.style.position = 'absolute';
  videoElement.style.top = '0';
  videoElement.style.right = '0';
  videoElement.style.bottom = '0';
  videoElement.style.left = '0';
  videoElement.style.width = '100%';
  videoElement.style.height = '100%';
  videoElement.style.objectFit = 'fill';
  videoElement.style.zIndex = '10000';
  videoElement.style.mixBlendMode = 'multiply';
  videoElement.style.pointerEvents = 'none';

  videoElement.setAttribute('src', 'data:video/mp4;base64,AAAAHGZ0eXBpc29tAAACAGlzb21pc28ybXA0MQAAAAhmcmVlAAAAvG1kYXQAAAAfTgEFGkdWStxcTEM/lO/FETzRQ6gD7gAA7gIAA3EYgAAAAEgoAa8iNjAkszOL+e58c//cEe//0TT//scp1n/381P/RWP/zOW4QtxorfVogeh8nQDbQAAAAwAQMCcWUTAAAAMAAAMAAAMA84AAAAAVAgHQAyu+KT35E7gAADFgAAADABLQAAAAEgIB4AiS76MTkNbgAAF3AAAPSAAAABICAeAEn8+hBOTXYAADUgAAHRAAAAPibW9vdgAAAGxtdmhkAAAAAAAAAAAAAAAAAAAD6AAAAKcAAQAAAQAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAw10cmFrAAAAXHRraGQAAAADAAAAAAAAAAAAAAABAAAAAAAAAKcAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAABAAAAAQAAAAAAAkZWR0cwAAABxlbHN0AAAAAAAAAAEAAACnAAAAAAABAAAAAAKFbWRpYQAAACBtZGhkAAAAAAAAAAAAAAAAAABdwAAAD6BVxAAAAAAAMWhkbHIAAAAAAAAAAHZpZGUAAAAAAAAAAAAAAABDb3JlIE1lZGlhIFZpZGVvAAAAAixtaW5mAAAAFHZtaGQAAAABAAAAAAAAAAAAAAAkZGluZgAAABxkcmVmAAAAAAAAAAEAAAAMdXJsIAAAAAEAAAHsc3RibAAAARxzdHNkAAAAAAAAAAEAAAEMaHZjMQAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAQABAASAAAAEgAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABj//wAAAHVodmNDAQIgAAAAsAAAAAAAPPAA/P36+gAACwOgAAEAGEABDAH//wIgAAADALAAAAMAAAMAPBXAkKEAAQAmQgEBAiAAAAMAsAAAAwAAAwA8oBQgQcCTDLYgV7kWVYC1CRAJAICiAAEACUQBwChkuNBTJAAAAApmaWVsAQAAAAATY29scm5jbHgACQAQAAkAAAAAEHBhc3AAAAABAAAAAQAAABRidHJ0AAAAAAAALPwAACz8AAAAKHN0dHMAAAAAAAAAAwAAAAIAAAPoAAAAAQAAAAEAAAABAAAD6AAAABRzdHNzAAAAAAAAAAEAAAABAAAAEHNkdHAAAAAAIBAQGAAAAChjdHRzAAAAAAAAAAMAAAABAAAAAAAAAAEAAAfQAAAAAgAAAAAAAAAcc3RzYwAAAAAAAAABAAAAAQAAAAQAAAABAAAAJHN0c3oAAAAAAAAAAAAAAAQAAABvAAAAGQAAABYAAAAWAAAAFHN0Y28AAAAAAAAAAQAAACwAAABhdWR0YQAAAFltZXRhAAAAAAAAACFoZGxyAAAAAAAAAABtZGlyYXBwbAAAAAAAAAAAAAAAACxpbHN0AAAAJKl0b28AAAAcZGF0YQAAAAEAAAAATGF2ZjYwLjMuMTAw');

  document.body.appendChild(videoElement);
}

function disable() {
  const videoElement = document.getElementById('hdr-video-overlay');
  if (videoElement) {
    videoElement.remove();
  }
}

const settingsIdentifier = [
  4,
  2,
  6,
  201,
  1,
  6,
  // 228,
  // 8,
  // 3,
  // 155,
  // 48,
  // 123,
];

// @ts-ignore
const vscodeAny = vscode as any;
vscodeAny.ipcRenderer.on('vscode:message', (_: any, data: Buffer) => {
  // const isConfig = settingsIdentifier.every((byte, index) => {
  //   console.log({ index, byte, data: data[index] });
  //   return byte === data[index];
  // });
  // console.log({ isConfig, settingsIdentifier });
  const string = new TextDecoder().decode(data);
  // if (isConfig) {
  // console.log('CONFIG', {isConfig, data, string});
  // }
  if (!string.includes('{')) {
    return;
  }
  const parsableMessage = string.slice(string.indexOf('{'), string.lastIndexOf('}') + 1)
    // 1) replace "/" in quotes with non-printable ASCII '\1' char
    .replace(/("([^\\"]|\\")*")|('([^\\']|\\')*')/g, (m) => m.replace(/\//g, '\x01'))
    
    // 2) clear comments
    .replace(/(\/\*[^*]+\*\/)|(\/\/[^\n]+)/g, '')
    
    // 3) restore "/" in quotes
    .replace(/\1/g, '/');
  try {
    const parsedMessage = JSON.parse(parsableMessage);
    console.log('PARSED', parsedMessage);
    if (!Object.prototype.hasOwnProperty.call(parsedMessage, 'hdr.enable')) {
      return;
    }
    if (parsedMessage['hdr.enable']) {
      console.log('enabling');
      enable();
    } else {
      console.log('disabling');
      disable();
    }
  } catch (err) {
    console.log('error parsing message', err);
    console.log('ERR MSG', parsableMessage, string.slice(string.indexOf('{'), string.lastIndexOf('}') + 1));
    return;
  }
});
