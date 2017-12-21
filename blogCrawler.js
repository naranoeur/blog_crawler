/*
 * Simple blog crawler. Checks to see if there have been any new posts since
 * last time it was ran, and saves images to file from new blog entries.
 * The name, url and last entry checked of the blogs is saved in bloginfo.json
 * file. The pages of one blog are checked synchronously,
 * (the crawler only moves onto the next page, once it finishes checking the
 * current page), while the different blogs are checked asynchronously.
 */

var request = require('request'),
    cheerio = require('cheerio'),
    fs = require('fs'),
    blogInfo = require('./bloginfo.json'),
    pagesDepth = 5;

console.log('Checking blogs for new posts...');

/* Function variables:
 * pageNum - the number of the blog page to check
 * blogNum specifies which blog to check (info can be found in bloginfo.json)
 * entryIds - an array of all the new entries
 * urls - an array of all the new images' urls
 * isDone - have we checked all the new blog entries yet?
 */
function iteratePages (pageNum, blogNum, entryIds, urls, isDone) {

  pageNum++;

  request(blogInfo.url[blogNum] + 'page-' + pageNum + '.html', function(err, resp, body){
    if (!err && resp.statusCode == 200) {
      var $ = cheerio.load(body);

      // Cycle through blog entries on the given page
      $('article').each(function(i, entry) {

        // Grab the unique entry id
        var entryId = $(entry).attr('data-unique-entry-id');
        if (blogInfo.lastEntryId[blogNum] == entryId || isDone) {
          isDone = true;
        } else {
          // If we have not reached end, retrieve all the images of the blog entry
          entryIds.push(entryId);
          $(entry).find('.articleText').find('a img').each(function(i,link) {
              urls.push($(link).attr('src'));
          });
        }
      })

      // If we have not reached last saved blog entry, load next page
      if (!isDone && pageNum < pagesDepth) {
        iteratePages(pageNum, blogNum, entryIds, urls, isDone);
      } else {
        // If we have reached last saved entry, save the most recent blog entry Id
        // and save the new images found
        if (entryIds.length > 0) {
          blogInfo.lastEntryId[blogNum] = entryIds[0];
          for (var i = 0; i < urls.length; i++) {
            request(urls[i]).pipe(fs.createWriteStream('images/' + blogInfo.name[blogNum] + i + '.jpg'));
          }
        }
        console.log('All done. ' + blogInfo.name[blogNum] + ' blog had ' + entryIds.length + ' new entries.');
      }
    }
  });
}

for (var i = 0; i < blogInfo.name.length; i++) {
  iteratePages(0, i, [], [], false);
}

// On exit, save the most recent blog entry checked for future reference
process.on('exit', function () {
  fs.writeFileSync( "bloginfo.json", JSON.stringify( blogInfo ), "utf8");
});
