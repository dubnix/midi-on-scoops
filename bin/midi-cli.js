'use strict';

const watch = require('node-watch');
const spawn = require('child_process').spawn;

const builder = require('../lib/builder');
const parser = require('../lib/parsing');

const children = [];

const log = msg => process.stdout.write(msg);

const musicDir = process.argv.slice(2)[0] || 'music';
const prefix = '♫';
const CLR = '\x1b[K';

const bin = process.argv.slice(2)[1] || 'timidity';
const argv = process.argv.slice(4);

let tt;

function exit() {
  children.forEach((child, k) => {
    children.splice(k, 1);
    child.kill('SIGINT');
  });

  clearTimeout(tt);

  process.exit(1);
}

function play(name) {
  log(`\b        Loading ${name} ...${CLR}\r`);

  const ast = parser(name);
  const code = builder(ast);

  children.splice(0, children.length)
    .forEach(child => {
      child.kill('SIGINT');
    });

  clearTimeout(tt);

  if (ast.settings.pause) {
    setTimeout(() => {
      log(`\b        ❚❚ Pause: ${name}${CLR}\r`);
    }, 100);
    return;
  }

  let _bin;
  let _argv;

  if (ast.settings.playback) {
    _argv = ast.settings.playback.split(' ');
    _bin = _argv.shift();
  } else {
    _argv = argv.slice();
    _bin = bin;
  }

  return code
    .save(name.replace('.dub', ''))
    .then(destFiles => {
      const deferred = [];

      destFiles.forEach(midi => {
        let cmd = [_bin].concat(_argv);

        if (midi.settings.playback) {
          cmd = midi.settings.playback.split(' ');
        }

        const args = cmd.slice(1).concat(midi.filepath);

        if (cmd[0] === 'fluidsynth') {
          args.push('-in');
        }

        const child = spawn(cmd[0], args, {
          detached: false,
        });

        deferred.push(new Promise((resolve, reject) => {
          child.on('close', resolve);
          child.on('error', reject);
        }));

        children.push(child);
      });

      const _length = Object.keys(ast.tracks).length;

      process.nextTick(() => {
        log(`\b        ► Playing: ${name} (${destFiles.length} track${
          destFiles.length === 1 ? '' : 's'
        }${_length !== destFiles.length ? `, ${_length} clip${
          _length === 1 ? '' : 's'
        }` : ''})${CLR}\r`);
      });

      return Promise.all(deferred).then(() => {
        log(`\b        ⏏ Stopped playing: ${name}${CLR}\r`);
      });
    })
    .catch(e => {
      log(`\n${e.message}\n`);
    });
}

let i = 0;

const chars = '\\|/-';

setInterval(() => {
  log(`\b${chars[i % chars.length]} ( ${prefix} )\r`);
  i++;
}, 200);

if (process.argv.slice(2)[0] && process.argv.slice(2)[0].indexOf('.dub') > -1) {
  play(process.argv.slice(2)[0]).then(() => setTimeout(exit, 100));
} else {
  log(`\b        Watching from: ${musicDir} ...${CLR}\r`);

  watch(musicDir, { recursive: true, filter: /\.dub$/ }, (evt, name) => {
    try {
      if (evt === 'update') {
        play(name);
      }
    } catch (e) {
      log(`\n${e.message}\n`);
    }

    log(`\b        ${name} changed${CLR}\r`);
  });
}

process.on('SIGINT', () => {
  log('\r\r');
  exit();
});