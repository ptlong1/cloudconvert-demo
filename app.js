const express = require('express');
const path = require('path');
const CloudConvert = require('cloudconvert');
const dirTree = require("directory-tree");
const sharp = require('sharp');
sharp.cache(false);

var cors = require('cors')


const app = express();
app.use(cors());
const port = 3000;
var fs = require('fs');
var https = require('https');
var DecompressZip = require('decompress-zip');
const { finished } = require('stream');
const { relative } = require('path');
const { folder } = require('decompress-zip/lib/extractors');
const { async } = require('q');

const cc_api = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiYmZjNzQzMjc3ZjgzOThmYmYyMzliM2ViNGI0YjkyNmIwZWU4ODFlMjNhYTA1MDhkZDg5ZTU4ODQ4OTIyN2JlNWRjODAwMTA1MWQ1ZTgxODAiLCJpYXQiOjE2NDg4MTAxODcuNTI3NDkyLCJuYmYiOjE2NDg4MTAxODcuNTI3NDk0LCJleHAiOjQ4MDQ0ODM3ODcuNTIzNjQ2LCJzdWIiOiI1NzA5MDUzMSIsInNjb3BlcyI6WyJ1c2VyLnJlYWQiLCJ1c2VyLndyaXRlIiwidGFzay5yZWFkIiwidGFzay53cml0ZSIsIndlYmhvb2sucmVhZCIsIndlYmhvb2sud3JpdGUiLCJwcmVzZXQud3JpdGUiLCJwcmVzZXQucmVhZCJdfQ.Vmrw9XmcKIoKD7kiAmO-1p2q2PXkaRQ-tTffp-8MEYh6aI_OzX4YElTz-_n5ib0Ly0Z7PRcU3MeuMUIjzjXmij_HRSOmuihZ3QhfduGeHwL0Io1rZ7xCSESTtvFJ245yw9FkX2GWrqXm7PQp4dzsQKCtiPwPV9WEEJ2LzC1NqHL6ny7o-kUXkivgMBxzD6n1Z1IRag2BgX4Xz35NtJKAZjSz9VVgJTrznXD_xvPuBQny3mcyAW6S2pWFsiMQmW1XFdKZlBh6gQgRP9r4-Ju0iipZwe4QDYbuJTeG396HTS452rIWDgA0lAoV1NwG3EzfEfABD9chd8hEniWw_Mb9wQuxVXha4eLng0ZHTF6jYlQ3sCfnwQrQ7GcVk938snW38eoNwFQf6-W-l7VG9gK1WN7n83p7v-yC0-oD6rCDJ5UTu9UD7NNV-R9WSWIWwxn-MOQEIw9d1JSO87Ds7VXQqmi-pKXE-qdkqBGat6A9bESJ2NbLoxlThCkCuOV-HQdStaTGAjNM-jZ59zqdWNB77RI2JgtMqlmLNB787agEqH3JkJkbaGHWjl_7K8_24cv7ZoxGAtKoJ057NCiSF7-bsgoH3Ga0SEy5lRWNxsRkWyHI5Vd5mw-GSFfI0gH3dNW6cuPrVlMPswUXZ_Nzmt-0SiF3PsufD1y3qaW1qlJLXZs";

const cloudConvert = new CloudConvert(cc_api);

app.get('/', (req, res) => {
  res.send('Hello World!')
})


async function ResizeImage(path, ratio)
{
	var inputJpg = path;
	const image = await sharp(inputJpg)
		.metadata()
		.then(function(metadata) {
			console.log(metadata);
			sharp(inputJpg)
				.resize(Math.round(metadata.width / ratio), Math.round(metadata.height / ratio))
				.toBuffer(function(err, buffer) {
					fs.writeFile(inputJpg, buffer, function(e) {
					});
				});
		})
}


async function ListFilesInFolder(folderpath, resize = false)
{
	// console.log(folderpath);
	var relativePath = path.relative(__dirname, folderpath); 
	// console.log(relativePath);
	const filteredTree = dirTree(relativePath, {
		extensions: /\.(png|jpg)$/,
		normalizePath: true
	}, async (item, PATH, stats) =>{
		// await ResizeImage(item.path);
		// console.log(item.path);
	});
	// console.log(filteredTree);
	if (resize == true)
	{
		for (let i = 0; i < filteredTree.children.length; ++i)
		{
			console.log(filteredTree.children[i].path);
			await ResizeImage(filteredTree.children[i].path, 5);
		}
	}
	return JSON.stringify(filteredTree);
}
async function Unzip(root, zipname, res = null)
{
	var filepath = path.join(root, zipname);
	var folderpath = path.join(root, path.parse(filepath).name);
	console.log(filepath);
	var unzipper = new DecompressZip(filepath);
	unzipper.on('error', function (err) {
		console.log('Caught an error');
		console.log(err);
	});

	unzipper.on('extract', async function (log) {
		console.log('Finished extracting');

		// list file
		console.log(filepath);
		// var unzipper1 = new DecompressZip(filepath);
		// unzipper1.on('list', function (files) {
		// 	console.log('The archive contains:');
		// 	console.log(files);
		// });

		// unzipper1.list();
		if (res != null)
		{
			var result = await ListFilesInFolder(folderpath, true);
			return res.send(result);
		}

	});

	unzipper.on('progress', function (fileIndex, fileCount) {
		// console.log('Extracted file ' + (fileIndex + 1) + ' of ' + fileCount);
	});

	console.log("folder path:" + folderpath);
	// unzipper.list();
	unzipper.extract({
		path: folderpath,		
		restrict: false
	});
	// console.log("finish extract");
}

// Unzip("./files", "Report.zip");

async function ConvertFile(filepath)
{
	let job = await cloudConvert.jobs.create({
    "tasks": {
        "import-1": {
			"operation": "import/upload",
		},
        "task-1": {
            "operation": "convert",
            "input": "import-1",
			"output_format": "png",
        },
        "export-1": {
            "operation": "export/url",
            "input": "task-1",
            "inline": false,
            "archive_multiple_files": true
        }
    },
    "tag": "jobbuilder"
	});
	console.log("create job");
	
	const uploadTask = job.tasks.filter(task => task.name === 'import-1')[0];

	const inputFile = fs.createReadStream(filepath);

	await cloudConvert.tasks.upload(uploadTask, inputFile, path.parse(filepath).base);

	job = await cloudConvert.jobs.wait(job.id); // Wait for job completion

	const exportTask = job.tasks.filter(
    	task => task.operation === 'export/url' && task.status === 'finished'
	)[0];
	const file = exportTask.result.files[0];

	var zipname = path.parse(filepath).name + '.zip';
	const writeStream = fs.createWriteStream('./files/' + zipname);

	https.get(file.url, function (response) {
		response.pipe(writeStream);
	});

	await new Promise((resolve, reject) => {
		writeStream.on('finish', resolve);
		writeStream.on('error', reject);
	});
	console.log("finish download");
	return zipname;

}
// fs.createWriteStream('./files/test.txt');
app.get('/files/:filename', async (req, res)=>{
	// res.sendFile(path.join(__dirname, 'files/' +req.params.filename));


	var filepath = path.join(__dirname, 'files/' +req.params.filename);
	var folderpath = path.join(__dirname, 'files/' + path.parse(filepath).name);
	console.log("file path:" + filepath);
	console.log("folder path:" + folderpath);
	if (fs.existsSync(folderpath))
	{
		console.log("folder exist");
		//create json and send
		var result = await ListFilesInFolder(folderpath);
		res.send(result);
	}
	else
	{
		console.log("folder not exist");
		// convert file and make folder
		var zipname = await ConvertFile(filepath);
		Unzip('./files', zipname, res);
		// res.send(result);
		// res.send(ListFilesInFolder(folderpath));
	}
	// res.send("finish job");
});

app.get('/files/:folder/:filename', (req, res)=>{
	var filepath = path.join(__dirname,'./files', req.params.folder, req.params.filename);
	console.log(filepath);
	res.sendFile(filepath);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})