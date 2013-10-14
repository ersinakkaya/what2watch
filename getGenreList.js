var mdb = require('moviedb')('587f66b889909f01e5c37ef1bafe2cca'),
	neo4j = require('neo4j'),
	db = new neo4j.GraphDatabase('http://localhost:7474')

mdb.genreList(function(err, res) {

	res.genres.forEach(function(genre) {

		var genreNode = db.createNode({
			genreId : genre.id,
			name : genre.name
		})

		genreNode.save(function(err, savedGenreNode) {
			if(err)
				console.log('Genre err: ' + err)
			else {
				// Index saved country node
				console.log('Genre:' + savedGenreNode.toString() + ' & genreId:' + savedGenreNode.data.genreId)
				savedGenreNode.index('genre', 'genreId', savedGenreNode.data.genreId, function() {})
			}
		})

	})

})