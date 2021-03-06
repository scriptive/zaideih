
import path from 'path';

import {seek} from 'lethil';
import config from './config.js';

import * as cloud from './cloud.js';
import {trackPlays} from './track.js';

const contentType = 'audio/mpeg';

/**
 * @param {*} req
 * @param {*} res
 * @param {*} row
 */
async function streamCloud(req, res, row){
  const audio = cloud.bucket.file(row.dir);
  return audio.getMetadata().then(
    meta=> {
      var stat = meta[0];
      var range = req.headers.range;
      if (range !== undefined) {
        // var rangeByte = range.replace(/bytes=/, "").split("-");
        // var rangeByteStart = rangeByte[0];
        // var rangeByteEnd = rangeByte[1];
        const [rangeByteStart, rangeByteEnd] = range.replace(/bytes=/, "").split("-");

        if ((isNaN(rangeByteStart) && rangeByteStart.length > 1) || (isNaN(rangeByteEnd) && rangeByteEnd.length > 1)) {
          return res.sendStatus(500);
        }
        var contentStart = parseInt(rangeByteStart, 10);
        var contentEnd = rangeByteEnd ? parseInt(rangeByteEnd, 10) : stat.size - 1;
        var contentLength = (contentEnd - contentStart) + 1;

        res.status(206).setHeader({'Content-Play':row.plays,'Content-Type':contentType,'Content-Length':contentLength,'Content-Range':"bytes " + contentStart + "-" + contentEnd + "/" + stat.size});
        // audio.createReadStream({contentType:contentType,validation:false,start:contentStart,end:contentEnd}).pipe(res);
        // userProject?: string;
        // validation?: 'md5' | 'crc32c' | false | true;
        // start?: number;
        // end?: number;
        // decompress?: boolean;
        audio.createReadStream({
          validation: false, start: contentStart, end: contentEnd
        }).on('error', () => res.status(404)).on('end', () => res.end()).pipe(res);
      } else{
        res.setHeader({'Content-Play':row.plays,'Content-Type':contentType,'Content-Length':stat.size});
        audio.createReadStream().pipe(res);
      }
    }
  ).catch(
    (e)=> {
      throw e;
    }
  )
}

/**
 * @param {*} req
 * @param {*} res
 * @param {*} row
 */
async function streamDisk(req, res,row){
  var file = path.resolve(config.setting.storage,row.dir);
  try {
    var stat = seek.statSync(file);
    var range = req.headers.range;
    if (range !== undefined) {
      // var rangeByte = req.headers.range.replace(/bytes=/, "").split("-");
      // var rangeByteStart = rangeByte[0];
      // var rangeByteEnd = rangeByte[1];
      const [rangeByteStart, rangeByteEnd] = range.replace(/bytes=/, "").split("-");

      if ((isNaN(rangeByteStart) && rangeByteStart.length > 1) || (isNaN(rangeByteEnd) && rangeByteEnd.length > 1)) {
        return res.sendStatus(500);
      }
      var contentStart = parseInt(rangeByteStart, 10);
      var contentEnd = rangeByteEnd ? parseInt(rangeByteEnd, 10) : stat.size - 1;
      var contentLength = (contentEnd - contentStart) + 1;
      res.status(206).setHeader({'Content-Play':row.plays,'Content-Type':contentType,'Content-Length':contentLength,'Content-Range':"bytes " + contentStart + "-" + contentEnd + "/" + stat.size});
      seek.readStream(file, {start: contentStart, end: contentEnd}).pipe(res);
    } else {
      res.setHeader({'Content-Play':row.plays,'Content-Type':contentType,'Content-Length':stat.size});
      seek.readStream(file).pipe(res);
    }
  } catch (e) {
    throw e;
  }
}

/**
 * @param {*} req
 * @param {*} res
 */
export function streamer(req, res) {
  trackPlays(req.params.trackId).then(row=>{
    // console.log('mp3:',row.id,row.plays,row.dir);
    streamCloud(req, res,row).catch(
      () => streamDisk(req, res,row).catch(
        () => res.status(404).end()
      )
    )
  }).catch(()=>{
    streamDisk(req, res,{dir:'music/tmp/'+req.params.trackId,plays:"development"}).catch(
      ()=>{
        res.status(404).end();
      }
    )
  });
}

/*
// 1076 1057
routes.get('/audio/:trackId', function(req, res) {
  const contentType = 'audio/mpeg';
  assist.trackId(req.params.trackId).then(row=>{
    if (row){
      // console.log('mp3:',row.id,row.plays,row.dir);
      const audio = assist.audio.file(row.dir);
      audio.getMetadata().then(
        meta=> {
          var stat = meta[0];
          var range = req.headers.range;
          if (range !== undefined) {
            // var rangeByte = range.replace(/bytes=/, "").split("-");
            // var rangeByteStart = rangeByte[0];
            // var rangeByteEnd = rangeByte[1];
            const [rangeByteStart, rangeByteEnd] = range.replace(/bytes=/, "").split("-");

            if ((isNaN(rangeByteStart) && rangeByteStart.length > 1) || (isNaN(rangeByteEnd) && rangeByteEnd.length > 1)) {
              return res.sendStatus(500);
            }
            var contentStart = parseInt(rangeByteStart, 10);
            var contentEnd = rangeByteEnd ? parseInt(rangeByteEnd, 10) : stat.size - 1;
            var contentLength = (contentEnd - contentStart) + 1;

            res.status(206).setHeader({'Content-Play':row.plays,'Content-Type':contentType,'Content-Length':contentLength,'Content-Range':"bytes " + contentStart + "-" + contentEnd + "/" + stat.size});
            // audio.createReadStream({contentType:contentType,validation:false,start:contentStart,end:contentEnd}).pipe(res);
            audio.createReadStream({
              contentType: contentType,validation: false, start: contentStart, end: contentEnd
            }).on('error', () => res.status(404)).on('end', () => res.end()).pipe(res);
          } else{
            res.setHeader({'Content-Play':row.plays,'Content-Type':contentType,'Content-Length':stat.size});
            audio.createReadStream({contentType: contentType}).pipe(res);
          }
        }
      ).catch(
        ()=> {
          console.log('')
          res.status(404).end()
        }
      )
    } else {
      var file = path.resolve(config.setting.storage,'music/tmp',req.params.trackId);
      try {
        var stat = seek.statSync(file);
        if (req.headers.range !== undefined) {
          // var rangeByte = req.headers.range.replace(/bytes=/, "").split("-");
          // var rangeByteStart = rangeByte[0];
          // var rangeByteEnd = rangeByte[1];
          const [rangeByteStart, rangeByteEnd] = range.replace(/bytes=/, "").split("-");

          if ((isNaN(rangeByteStart) && rangeByteStart.length > 1) || (isNaN(rangeByteEnd) && rangeByteEnd.length > 1)) {
            return res.sendStatus(500);
          }
          var contentStart = parseInt(rangeByteStart, 10);
          var contentEnd = rangeByteEnd ? parseInt(rangeByteEnd, 10) : stat.size - 1;
          var contentLength = (contentEnd - contentStart) + 1;
          res.status(206).setHeader({'Content-Type':contentType,'Content-Length':contentLength,'Content-Range':"bytes " + contentStart + "-" + contentEnd + "/" + stat.size});
          seek.readStream(file, {start: contentStart, end: contentEnd}).pipe(res);
        } else {
          res.setHeader({'Content-Type':contentType,'Content-Length':stat.size});
          seek.readStream(file).pipe(res);
        }
      } catch (e) {
        res.status(404).end();
      }
    }
  }).catch(()=>{
    res.status(404).end();
  });
});
*/

/*
const audio = Cloud.bucket.file('music/myanmar/MMGSL/Never.Say.Die/05.mp3');
audio.getMetadata().then(
  meta=> {
    var stat = meta[0];
    var range = req.headers.range;
    if (range !== undefined) {
      var rangeByte = range.replace(/bytes=/, "").split("-");
      var rangeByteStart = rangeByte[0];
      var rangeByteEnd = rangeByte[1];

      if ((isNaN(rangeByteStart) && rangeByteStart.length > 1) || (isNaN(rangeByteEnd) && rangeByteEnd.length > 1)) {
        return res.sendStatus(500);
      }
      var contentStart = parseInt(rangeByteStart, 10);
      var contentEnd = rangeByteEnd ? parseInt(rangeByteEnd, 10) : stat.size - 1;
      var contentLength = (contentEnd - contentStart) + 1;
      res.status(206).setHeader({'Content-Type':contentType,'Content-Length':contentLength,'Content-Range':"bytes " + contentStart + "-" + contentEnd + "/" + stat.size});
      // audio.createReadStream({contentType:contentType,validation:false,start:contentStart,end:contentEnd}).pipe(res);
      audio.createReadStream({
        contentType: contentType,validation: false, start: contentStart, end: contentEnd
      }).on('error', () => res.status(404)).on('end', () => res.end()).pipe(res);
    } else{
      res.setHeader({'Content-Type':contentType,'Content-Length':stat.size});
      audio.createReadStream({contentType: contentType}).pipe(res);
    }
  }
).catch(
  ()=>res.status(404).end()
)
*/
/*
routes.get('/audio-cloud-stream', function(req, res) {
  const contentType = 'audio/mpeg';
  const audio = Cloud.bucket.file('music/myanmar/MMGSL/Never.Say.Die/05.mp3');
  audio.getMetadata().then(
    meta=> {
      var stat = meta[0];
      var range = req.headers.range;
      if (range !== undefined) {
        var rangeByte = range.replace(/bytes=/, "").split("-");
        var rangeByteStart = rangeByte[0];
        var rangeByteEnd = rangeByte[1];

        if ((isNaN(rangeByteStart) && rangeByteStart.length > 1) || (isNaN(rangeByteEnd) && rangeByteEnd.length > 1)) {
          return res.sendStatus(500);
        }
        var contentStart = parseInt(rangeByteStart, 10);
        var contentEnd = rangeByteEnd ? parseInt(rangeByteEnd, 10) : stat.size - 1;
        var contentLength = (contentEnd - contentStart) + 1;
        res.status(206).setHeader({'Content-Type':contentType,'Content-Length':contentLength,'Content-Range':"bytes " + contentStart + "-" + contentEnd + "/" + stat.size});
        // audio.createReadStream({contentType:contentType,validation:false,start:contentStart,end:contentEnd}).pipe(res);
        audio.createReadStream({
          contentType: contentType,validation: false, start: contentStart, end: contentEnd
        }).on('error', () => res.status(404)).on('end', () => res.end()).pipe(res);
      } else{
        res.setHeader({'Content-Type':contentType,'Content-Length':stat.size});
        audio.createReadStream({contentType: contentType}).pipe(res);
      }
    }
  ).catch(
    ()=>res.status(404).end()
  )
});
*/
/*
routes.get('/audio-cloud-download', function(req, res) {
  Cloud.bucket.file('music/myanmar/MMGSL/Never.Say.Die/03.mp3').createReadStream({
    contentType: 'audio/mpeg',
  }).on('error',
    () => res.status(404)
  ).on('response',
    streamResponse => {
      res.setHeader('Content-Length', streamResponse.headers['content-length']);
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-disposition', 'attachment; filename="0"'.replace('0',path.basename('tmp.mp3')));
    }
  ).on('end',
    () => res.end()
  ).pipe(res);
});
*/
/*
routes.get('/audio-local-stream/:trackId', function(req, res) {
  const contentType = 'audio/mpeg';
  new Music(req.params).trackId().then(row=>{
    try {
      var music = row?path.resolve(storage,'music',row.PATH):path.resolve(storage,'music/tmp',req.params.trackId);
      var stat = seek.statSync(music);
      if (req.headers.range !== undefined) {
        var rangeByte = req.headers.range.replace(/bytes=/, "").split("-");
        var rangeByteStart = rangeByte[0];
        var rangeByteEnd = rangeByte[1];

        if ((isNaN(rangeByteStart) && rangeByteStart.length > 1) || (isNaN(rangeByteEnd) && rangeByteEnd.length > 1)) {
          return res.sendStatus(500);
        }
        var contentStart = parseInt(rangeByteStart, 10);
        var contentEnd = rangeByteEnd ? parseInt(rangeByteEnd, 10) : stat.size - 1;
        var contentLength = (contentEnd - contentStart) + 1;
        res.status(206).setHeader({'Content-Type':contentType,'Content-Length':contentLength,'Content-Range':"bytes " + contentStart + "-" + contentEnd + "/" + stat.size});
        seek.readStream(music, {start: contentStart, end: contentEnd}).pipe(res);
      } else {
        res.setHeader({'Content-Type':contentType,'Content-Length':stat.size});
        seek.readStream(music).pipe(res);
      }
    } catch (e) {
      res.status(404).end();
    }
  }).catch(()=>{
    res.status(404).end();
  });
});
*/
/*
routes.get('/audio-not-in-used/:id', (req, res) => {
  var music = path.resolve(storage,'music/tmp',req.params.id);
  var stat = seek.statSync(music);
  var range = req.headers.range;
  var readStream;
  if (range !== undefined) {
    var parts = range.replace(/bytes=/, "").split("-");

    var partial_start = parts[0];
    var partial_end = parts[1];

    if ((isNaN(partial_start) && partial_start.length > 1) || (isNaN(partial_end) && partial_end.length > 1)) {
      return res.sendStatus(500);
    }

    var start = parseInt(partial_start, 10);
    var end = partial_end ? parseInt(partial_end, 10) : stat.size - 1;
    var content_length = (end - start) + 1;

    res.status(206).setHeader({
      'Content-Type': 'audio/mpeg',
      'Content-Length': content_length,
      'Content-Range': "bytes " + start + "-" + end + "/" + stat.size
    });

    readStream = seek.readStream(music, {start: start, end: end});
  } else {
    res.setHeader({'Content-Type': 'audio/mpeg','Content-Length': stat.size});
    readStream = seek.readStream(music);
  }
  readStream.pipe(res);
});
*/

/*
routes.get('/audio/:id', function(req,res){
  var music = path.resolve(storage,'music/tmp',req.params.id);
  fs.exists(music,function(exists){
    if(exists){
      seek.readStream(music).pipe(res);
    } else {
      res.status(404).end();
    }
  });
});
*/

/*
routes.get('/audio-download/:id', function(req,res){
  var music = path.resolve(storage,'music/tmp',req.params.id);
	fs.exists(music,function(exists){
		if(exists){
      res.setHeader('Content-disposition', 'attachment; filename=' + path.basename(music));
			res.setHeader('Content-Type', 'application/audio/mpeg3')
			seek.readStream(music).pipe(res);
		} else {
			res.status(404).end();
		}
	});
});
*/

/*
routes.get('/album-not-in-used', function(req, res, next) {
  let param={},
      query=req.query;
  if (query.q){
    param.q=query.q;
  }
  if (query.year){
    param.year=query.year;
  }
  if (query.genre){
    param.genre=query.genre;
  }
  if (query.page){
    param.page=query.page;
  }
  new Music(param).album(function (raw) {
    res.send({
      type: raw.type,
      meta: raw.meta,
      data: raw.data
    });
  });
});
*/

/*
routes.get('/artist-not-in-used', function(req, res, next) {
  let param={},
      query=req.query;
  if (query.q){
    param.q=query.q;
  }
  if (query.year){
    param.year=query.year;
  }
  if (query.genre){
    param.genre=query.genre;
  }
  if (query.page){
    param.page=query.page;
  }
  new Music(param).artist(function (raw) {
    res.send(raw);
    // res.send({
    //   type: raw.type,
    //   meta: raw.meta,
    //   data: raw.data
    // });
  });
});
*/