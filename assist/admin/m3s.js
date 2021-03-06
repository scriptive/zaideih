import path from 'path';
// import fs from 'fs';
import {ask} from 'lethil';
import {config,store} from '../anchor/index.js';

import {JSDOM} from 'jsdom';
import NodeID3 from 'node-id3';

const job={
  help:()=>console.table(Object.keys(job)),
  // params:{} -> req.params
};

/**
 * working
 * m3s-:jobName/:jobType?
 * @param {any} req
 * node run m3s-cloud/zola
 * node run id3-cloud/zola/617119a809b161d81cee
 * node run id3-local/myanmar/3f47207211bbc340a36f
 *
 * node run m3s-album/multi
 * node run m3s-album/single
 * node run m3s-album/single
 */
export default async function(req){
  var jobName = req.params.jobName;
  var jobType = req.params.jobType;

  setting.info.artistListData = await store.read(setting.info.artistListFile);
  setting.info.albumListData = await store.read(setting.info.albumListFile);
  try {
    if (typeof job[jobName] == 'function') {
      job.params = req.params;
      return await job[jobName]() || 'Done';
    }
    return 'avaliable: '+ Object.keys(job).join(', ')
  } catch (error) {
    return error.message || error;
  }
}

const setting={
  task:[],
  info:{
    albumListType: ['S','C','V'],
    albumListData: [],
    albumListFile: 'm3s-album-list.json',

    artistListType: ['M','F','G'],
    artistListData: [],
    artistListFile: 'm3s-artist-list.json',

    albumArtFile: 'albumId/cover.fileExtension',
    trackFile: 'albumId/trackNumber.mp3'
  },
  // template:{
  //   album:{
  //     cover:'?',
  //     info: {
  //       albumType:'?',
  //       released:'?',
  //       band:'?',
  //       track:'?',
  //       producer:'?',
  //       label:'?',
  //       studio:'?'
  //     },
  //     name:'?',
  //     local:0,
  //     track:[]
  //   },
  //   track:{
  //     id: '?',
  //     artist: [],
  //     album: '?',
  //     title: '?',
  //     number: '?',
  //     local:0
  //   },
  // },
  taskCurrent:{
    albumId:0,
    albumArt:'',
    localTrackFile:'',
    localAlbumArtFile:'',
    track:{},

    artistId:0,
    albumListType:'V',
    albumListPage:1,
    artistListType:'G',
    artistListPage:1,
  },
};

const domainName = 'www.myanmarmp3.net';
const root = path.join(config.setting.storage,'m3s');

setting.info.albumListFile = path.join(root,setting.info.albumListFile);
setting.info.artistListFile = path.join(root,setting.info.artistListFile);

job.albumListProcess = async function(pathQuery){
  // /mm/albums/index?albumType=albumListType&Albums-page=albumListPage
  // /mm/artists/browse/artistId/a/albumListType?Albums-page=albumListPage
  var taskCompleted = false;

  await ask.get({
    host: domainName,
    path: pathQuery
      .replace('albumListType',setting.taskCurrent.albumListType)
      .replace('albumListPage',setting.taskCurrent.albumListPage)
      .replace('artistId',setting.taskCurrent.artistId),
    method: 'GET',
    headers: {
      'referer': domainName,
      "content-type": "text/html",
    }
  }).then(
    (res) => {
      const dom = new JSDOM(res);
      try {
        var html = dom.window.document.querySelectorAll("div#Albums>table>tbody>tr");
        // console.log(Object.keys(html).length === 0);
        var nextPage = dom.window.document.querySelectorAll("div.t-pager > a")[2];
        taskCompleted = nextPage.getAttribute('href') == '#';
        if (html.length){
          html.forEach((e)=>{
            var a = e.getElementsByTagName('td')[0].querySelector('a');
            if (!a) {
              // NOTE: no album here
              console.log(' !','none');
              return;
            }
            var rowId = a.getAttribute('href').split('/')[4];
            var rowName = a.textContent.trim();
            var rowCheck = setting.info.albumListData.find(e=>e.id == rowId) == undefined;
            if (rowCheck) {
              setting.info.albumListData.push(
                {
                  id:rowId,
                  name:rowName
                }
              )
              console.log(' +',rowId,rowName)
            } else {
              console.log(' !',rowId)
            }
          });
        }
      } catch (error) {
        console.log('  ',error);
      }
    }
  ).catch(
    (e) => {
      throw e;
    }
  );

  await store.write(setting.info.albumListFile,setting.info.albumListData);

  if (taskCompleted) {
    // NOTE: process to Album
    return 'Done';
  } else {
    // NOTE: process to nextPage
    setting.taskCurrent.albumListPage++;
    console.log('> next',setting.taskCurrent.albumListPage);
    return await job.albumListProcess(pathQuery);
  }
}

job.artistListProcess = async function(){
  var taskCompleted = false;

  await ask.get({
    host: domainName,
    path: '/mm/artists/list?artType=artistListType&Artists-page=artistListPage'
      .replace('artistListType',setting.taskCurrent.artistListType)
      .replace('artistListPage',setting.taskCurrent.artistListPage.toString()),
    method: 'GET',
    headers: {
      'referer': domainName,
      "content-type": "text/html",
    }
  }).then(
    (res) => {
      const dom = new JSDOM(res);
      try {
        var html = dom.window.document.querySelectorAll("div#Artists>table>tbody>tr");
        // console.log(Object.keys(html).length === 0);
        var nextPage = dom.window.document.querySelectorAll("div.t-pager > a")[2];
        taskCompleted = nextPage.getAttribute('href') == '#';

        html.forEach((e)=>{
          var a = e.getElementsByTagName('td')[0].querySelector('a');
          var rowId = a.getAttribute('href').split('/')[4];
          var rowName = a.textContent;
          var rowCheck = setting.info.artistListData.find(e=>e.id == rowId) == undefined;
          if (rowCheck) {
            setting.info.artistListData.push(
              {
                id:rowId,
                name:rowName
              }
            )
            console.log('+',rowId,rowName)
          } else {
            console.log('-',rowId)
          }
        });

      } catch (error) {
        console.log('>',error.message);
      }
    }
  ).catch(
    (e) => {
      throw e;
    }
  );

  await store.write(setting.info.artistListFile,setting.info.artistListData);

  if (taskCompleted) {
    // NOTE: process to Artist
    return 'Done';
  } else {
    // NOTE: process to nextPage
    setting.taskCurrent.artistListPage++;
    console.log('> next page',setting.taskCurrent.artistListPage);
    return await job.artistListProcess();
  }
}

job.albumDetailMulti = async function(){
  // setting.info.artistListData;
  // setting.info.albumListData;
  // var tmpTask = setting.info.albumListData.filter((month,idx) => idx < 2);
  // var tmpTask = setting.info.albumListData.slice(10, setting.info.albumListData.length);
  for (const e of setting.info.albumListData) {
    await job.albumDetailProcess(e);
  }
  return 'done';
}

job.albumDetailSingle = async function(){
  // setting.info.artistListData;
  // setting.info.albumListData;
  // var tmpTask = setting.info.albumListData.filter((month,idx) => idx < 2);
  // var tmpTask = setting.info.albumListData.slice(10, setting.info.albumListData.length);
  // for (const e of abc) await albumDetailProcess(e);
  // var tmpTaskSingle = setting.info.albumListData.find(e=>e.id == 857);
  // 857,474, 1464
  var tmpTask = setting.info.albumListData.filter(e=>e.id == 1464);
  for (const e of tmpTask) {
    e.local=0;
    e.track=[];
    await job.albumDetailProcess(e);
  }

  setting.taskCurrent.albumId=0;
  setting.taskCurrent.albumArt='';
  setting.taskCurrent.track={};
  return 'done';
}

job.albumDetailProcess = async function(albumDetailTmp){
  // mm/albums/pull/1436/best-of-2014
  // setting.taskCurrent.albumId=234;

  setting.taskCurrent.albumId=albumDetailTmp.id;
  if (albumDetailTmp.local && albumDetailTmp.local > 0) {
    console.log('+? albumId',setting.taskCurrent.albumId)
  } else {
    // albumDetailTmp.id=?;
    // albumDetailTmp.name=?;
    albumDetailTmp.info={};
    albumDetailTmp.cover='';
    albumDetailTmp.track=[];
    albumDetailTmp.local=0;

    var urlOptions = {
      host: domainName,
      path: '/mm/albums/pull/albumId/fe'.replace('albumId',setting.taskCurrent.albumId.toString()),
      method: 'GET',
      port: 443,
      headers: {
        'referer': domainName,
        "content-type": "text/html",
      }
    };
    await ask.get(urlOptions).then(
      async (res) => {
        const dom = new JSDOM(res);
        try {
          var albumWrap = dom.window.document.querySelector("div#albumwrap");
          var albumArt = albumWrap.querySelector("div.albumimg>img").getAttribute("src");
          var albumName = albumWrap.querySelector("div.albumdesc>div#albuminfo>div.h1m").textContent.trim();

          albumWrap.querySelectorAll("div.albumdesc>div#albuminfo>div.descbox>ul>li").forEach((e,i)=>{
            var typeKey = e.querySelector("img").getAttribute("alt");
            var typeValue = e.children[1].textContent.trim();
            // var typeValue = e.querySelector("span").textContent;
            // console.log(typeKey,typeValue);
            // console.log(typeKey,e.children[1].textContent);
            // if (typeKey=='Album Type') {
            // } else if (typeKey=='Released Date') {
            // } else if (typeKey=='Band') {
            // } else if (typeKey=='Rate Album') {
            // } else if (typeKey=='Number of Tracks') {
            // } else if (typeKey=='Produced by') {
            // } else if (typeKey=='Record Label') {
            // } else if (typeKey=='Recording Studio') {
            // }
            // Album Type
            switch (typeKey) {
              case 'Album Type':
                albumDetailTmp.info.albumType=typeValue;
                break;
              case 'Released Date':
                albumDetailTmp.info.released=typeValue;
                break;
              case 'Band':
                albumDetailTmp.info.band=typeValue;
                break;
              case 'Number of Tracks':
                albumDetailTmp.info.track=typeValue;
                break;
              case 'Produced by':
                albumDetailTmp.info.producer=typeValue;
                break;
              case 'Record Label':
                albumDetailTmp.info.label=typeValue;
                break;
              case 'Recording Studio':
                albumDetailTmp.info.studio=typeValue;
                break;
              default:
                var text = "NA";
            }
          });
          albumDetailTmp.cover=albumArt;
          albumDetailTmp.name=albumName;
          albumDetailTmp.track=[];

          setting.taskCurrent.albumArt=albumArt.replace(/ /g,'%20');
          dom.window.document.querySelectorAll("#GridTracks>table>tbody>tr").forEach(async (e,i)=>{
            var trkNumber =i+1;
            var trks = e.getElementsByTagName('td');
            var trackId =trks[1].querySelector('div').getAttribute('id');
            var trkTitle =trks[1].querySelector('div').textContent.trim();
            var trkArtists=[];

            trks[2].querySelectorAll('a').forEach(function(e){
              trkArtists.push(e.textContent.trim());
            });
            albumDetailTmp.track.push({
              id: trackId,
              artist: trkArtists,
              album: albumName,
              title: trkTitle,
              number: trkNumber,
              local:0
            });
          });
          albumDetailTmp.local=1;
          console.log('++ albumId',setting.taskCurrent.albumId)
        } catch (error) {
          console.log('>?',error.message);
        }
      }
    ).catch(
      (e) => {
        throw e;
      }
    );
    await albumArtDownload();
  }

  for (const e of albumDetailTmp.track) {
    // setting.taskCurrent.track=e;
    // await trackAudioDownload();
    // e.local=1;
    if (e.local && e.local > 0) {
      console.log('+? trackId',e.id,e.number)
    } else {
      setting.taskCurrent.track=e;
      try {
        await trackAudioDownload();
        e.local=1;
        console.log('++ trackId',e.id,e.number)
        await trackAudioID3(e);
      } catch (error) {
        console.log('?? trackId',e.id,error.message)
      }
    }
  }
  // await writeJSON(path.join(root,'tmp-'+albumId+'.json'),albumDetailTmp);
  await store.write(setting.info.albumListFile,setting.info.albumListData);

  return 'Done';
}

job.artistAlbum = async function(){
  // setting.info.artistListData;
  // setting.info.albumListData;

  var tmpTask = setting.info.artistListData.filter(e=>!e.local || e.local < 1);
  // var tmpTask = setting.info.artistListData.filter(e=>e.id == 12);
  for (const e of tmpTask) {
    setting.taskCurrent.artistId= e.id;
    // setting.taskCurrent.albumListPage = 1;
    // setting.taskCurrent.albumListType = ?;
    // console.log('>', 'artistId',setting.taskCurrent.artistId);

    try {
      for (const albumType of setting.info.albumListType) {
        setting.taskCurrent.albumListPage = 1;
        setting.taskCurrent.albumListType = albumType;
        // console.log('>', 'albumType',albumType);
        console.log('>', 'artist',albumType,setting.taskCurrent.artistId);
        await job.albumListProcess('/mm/artists/browse/artistId/a/albumListType?Albums-page=albumListPage');
      }
      e.local=1;
    } catch (error) {
      console.log(' ',error.message);
    }
  }

  // for (const albumType of setting.info.albumListType) {
  //   console.log('>', 'albumType',albumType);
  // }
  // setting.taskCurrent={
  //   albumId:0,
  //   albumArt:'',
  //   track:{}
  // };
  await store.write(setting.info.artistListFile,setting.info.artistListData);

  return 'done';

}

job.id3UpdateYear = async function(){
  var taskCurrent = setting.info.albumListData;
  // var taskCurrent = setting.info.albumListData.filter(e=>e.id==9);
  // var taskCurrent = setting.info.albumListData.filter(e=>e.id==9);
  for (const album of taskCurrent) {
    if (album.info){
      var year = album.info.released.split('/').slice(-1).pop();
      // console.log(album.id,year);
      // if (year.length != 4) {
      //   console.log(album.id,year);
      // }
      for (const track of album.track) {
        if (track.local && track.local > 0) {
          var file = 'd:/m3s/albumId/trackNumber.mp3'.replace('albumId',album.id).replace('trackNumber',track.number);
          let tags = {
            TYER:year,
            TCON:'',
            TCOP:album.info.label.trim()||'',
            TPUB:album.info.studio.trim()||'',
            TCOM:album.info.producer.trim()||'',
            COMM:{
              language: "eng", text: "zaideih.com"
            },
            TPOS:1
          }
          await NodeID3.Promise.update(tags, file);
        }
      }
      console.log('> album',album.id);
    } else {
      console.log('> no "album.info"');
    }
  }
}

async function trackAudioID3(e){
  // id: trackId,
  // artist: trkArtists,
  // album: albumName,
  // title: trkTitle,
  // number: trkNumber,
  // local:0
  let tags = {
    TIT2:  e.title, // NOTE: title
    TPE1:  e.artist.join(';'), // NOTE: artist
    TALB:  e.album, // NOTE: album
    APIC: setting.taskCurrent.localAlbumArtFile, // NOTE: album art
    TRCK:  e.number, // NOTE: track number
    // TYER:  e.year, // NOTE: album year/release{yyyy}
    // TCON:  e.genre, // NOTE: genre
    // TCOM:  e.composer, // NOTE: composer/band
    // TCOP:  e.copyright, // NOTE: copyright/label
    // TPUB:  e.publisher, // NOTE: publisher/studio
    // TPE3:  e.producer, // NOTE: conductor/producer
    // COMM:  e.comment // NOTE: comment
    // TPOS:  e.partOfSet // NOTE: partOfSet
    // TPE2:  e.albumartist // NOTE: albumartist/performerInfo
    // TBPM:      128
    // WPAY:      'https://google.com'
    // TKEY:      'Fbm'
  };

  await NodeID3.Promise.create(tags);
  await NodeID3.Promise.write(tags, setting.taskCurrent.localTrackFile);
}

async function trackAudioDownload(){
  // setting.taskCurrent.albumId;
  // setting.taskCurrent.track;

  var urlOptions = {
    host: domainName,
    path: '/track/ProcessNTrack/trackId'.replace('trackId',setting.taskCurrent.track.id),
    // url: 'https://domainName/track/ProcessNTrack/trackId'.replace('domainName',domainName).replace('trackId',trackId),
    method: 'GET',
    port: 443,
    headers: {
      'referer': domainName,
      "Content-type": "audio/mpeg",
    }
  };

  var file = setting.info.trackFile.replace('albumId',setting.taskCurrent.albumId.toString()).replace('trackNumber',setting.taskCurrent.track.number);
  setting.taskCurrent.localTrackFile = path.join(root,file);
  await ask.download(urlOptions,setting.taskCurrent.localTrackFile);
}

async function albumArtDownload(){
  // setting.taskCurrent.albumId;
  // setting.taskCurrent.track;

  var urlOptions = {
    host: domainName,
    path: setting.taskCurrent.albumArt,
    method: 'GET',
    port: 443,
    headers: {
      'referer': domainName,
      "Content-type": "image/jpeg",
    }
  };

  var fileExtension = setting.taskCurrent.albumArt.split('.').pop().toLowerCase();
  var file = setting.info.albumArtFile.replace('albumId',setting.taskCurrent.albumId.toString()).replace('fileExtension',fileExtension);
  setting.taskCurrent.localAlbumArtFile = path.join(root,file);
  await ask.download(urlOptions,setting.taskCurrent.localAlbumArtFile);
}
