var mdb = require('moviedb')('587f66b889909f01e5c37ef1bafe2cca'),
	neo4j = require('neo4j'),
	db = new neo4j.GraphDatabase('http://localhost:7474'),
	async = require('async')

var j = 1

setInterval(getMovies, 500)

function getMovies() {
  	mdb.movieInfo({ id : j }, function(err, movie) {
  		if(movie != null) {

	  		var movieNode = db.createNode({
	  			tmdbId : movie.id,
	  			imdbId : (movie.imdb_id != null) ? movie.imdb_id : '',
	  			title : (movie.title != null) ? movie.title : '',
	  			originalTitle : (movie.original_title != null) ? movie.original_title : '',
	  			overview : (movie.overview != null) ? movie.overview : '',
	  			popularity : (movie.popularity != null) ? movie.popularity : 0,
	  			releaseDate : (movie.release_date != null) ? movie.release_date : '',
	  			runtime : (movie.runtime != null) ? movie.runtime : 0,
	  			tagline : (movie.tagline != null) ? movie.tagline : '',
	  			voteAverage : (movie.vote_average != null) ? movie.vote_average : 0,
	  			voteCount : (movie.vote_count != null) ? movie.vote_count : 0,
	  			productionYear : (movie.release_date != '') ? parseInt(movie.release_date.substr(0,4)) : 0,
	  			posterPath : (movie.poster_path != null) ? movie.poster_path : ''
	  		})

	  		movieNode.save(function(err, savedMovieNode) {
	  			if(err) {
	  				console.log('Movie node err: ' + err)
	  				console.log(movieNode.data)
	  			} else {
			  		// Add movie to necessary index
			  		savedMovieNode.index('movie', 'id', savedMovieNode.id, function() {})
			  		savedMovieNode.index('movie', 'tmdbId', savedMovieNode.data.tmdbId, function() {})
			  		savedMovieNode.index('movie', 'imdbId', savedMovieNode.data.imdbId, function() {})
			  		savedMovieNode.index('movie', 'title', savedMovieNode.data.title, function() {})

	  				// Create [movie :HAS_GENRE genre] relationship
	  				movie.genres.forEach(function(genre) {
			  			db.getIndexedNode('genre', 'genreId', genre.id, function(err, genreNode) {
			  				// Check if genre exists in index
			  				if(genreNode != undefined) {
								savedMovieNode.createRelationshipTo(genreNode, 'HAS_GENRE', { }, function(err, rel) {
									if(err) {
										console.log('Genre relationship: ' + err)
										console.log('------------------------------------------------------------------------')
										console.log('Genre Node: ' + genreNode)
										console.log('Genre ID: ' + genre.id)
									}
								})
							} else {
								console.log('Genre ID: ' + genre.id + ' does not exist in index')
							}
						})
			  		})

	  				// Create [movie :BELONGS_TO_COUNTRY country] relationship
	  				movie.production_countries.forEach(function(country) {
			  			db.getIndexedNode('country', 'countryId', country.iso_3166_1, function(err, countryNode) {
							/**
		  					* @todo 
		  					* Country 'AN' fix
		  					* Country 'CS' fix
		  					**/

			  				// Check if country exists in index
			  				if(countryNode != undefined) {
								savedMovieNode.createRelationshipTo(countryNode, 'BELONGS_TO_COUNTRY', { }, function(err, rel) {
									if(err) {
										console.log('Country relationship: ' + err)
										console.log('------------------------------------------------------------------------')
										console.log('Country Node: ' + countryNode)
										console.log('Country ID: ' + country.iso_3166_1)
									}
								})
							} else {
								console.log('Country ID: ' + country.iso_3166_1 + ' does not exist in index')
							}
						})
			  		})

			  		// Create [movie :HAS_LANGUAGE_SPOKEN language] relationship
	  				movie.spoken_languages.forEach(function(language) {
	  					// Chinese language fix (cn -> zh)
	  					language.iso_639_1 = (language.iso_639_1 == 'cn') ? 'zh' : language.iso_639_1
	  					/**
	  					* @todo 
	  					* Language 'sh' fix
	  					* Language 'xx' fix
	  					**/

			  			db.getIndexedNode('language', 'languageId', language.iso_639_1, function(err, languageNode) {
			  				// Check if language exists in index
			  				if(languageNode != undefined) {
								savedMovieNode.createRelationshipTo(languageNode, 'HAS_LANGUAGE_SPOKEN', { }, function(err, rel) {
									if(err) {
										console.log('Language relationship: ' + err)
										console.log('------------------------------------------------------------------------')
										console.log('Language Node: ' + languageNode)
										console.log('Language ID: ' + language.iso_639_1)
									}
								})
							} else {
								console.log('Language ID: ' + language.iso_639_1 + ' does not exist in index')
							}
						})
			  		})

			  		// Movie casts
			  		mdb.movieCasts({ id : savedMovieNode.data.tmdbId }, function(err, casts) {
			  			
			  			// Cast relations
			  			if(casts != null) {
			  				casts.cast.forEach(function(person) {
			  					// Get person from index if possible
			  					db.getIndexedNode('person', 'tmdbId', person.id, function(err, personNode) {
									// Person node is not in index
			  						if(personNode == undefined) {
			  							var newPersonNode = db.createNode({
								  			tmdbId : person.id,
								  			name : (person.name != null) ? person.name : '',
								  			birthday : (person.birthday != null) ? person.birthday : '',
								  			biography : (person.biography != null) ? person.biography : '',
								  			profilePath : (person.profile_path != null) ? person.profile_path : ''
								  		})

			  							// Save person node
								  		newPersonNode.save(function(err, savedPersonNode) {
								  			// Index person node
								  			savedPersonNode.index('person', 'id', savedPersonNode.id, function() {})
								  			savedPersonNode.index('person', 'tmdbId', savedPersonNode.data.tmdbId, function() {})

								  			// Create [person :ACTS_IN movie] relationship
								  			savedPersonNode.createRelationshipTo(savedMovieNode, 'ACTS_IN', { character : (person.character != null) ? person.character : '' }, function(err, rel) {
								  				if(err) {
								  					console.log('Acts in relationship (Create new node): ' + err)
													console.log('------------------------------------------------------------------------')
													console.log('Person Node: ' + savedPersonNode.data)
								  				} else {
							  						// Create [:ACTS_IN] relationship index
								  					rel.index('actsIn', 'id', rel.id, function() {})
								  					if(person.character != null) {
								  						rel.index('actsIn', 'character', person.character, function() {})
								  					}
								  				}
								  			})
								  		})
			  						} else {
			  							// Create [person :ACTS_IN movie] relationship
			  							personNode.createRelationshipTo(savedMovieNode, 'ACTS_IN', { character : (person.character != null) ? person.character : '' }, function(err, rel) {
							  				if(err) {
							  					console.log('Acts in relationship (Get node from index): ' + err)
												console.log('------------------------------------------------------------------------')
												console.log('Person Node: ' + personNode)
							  				} else {
							  					// Create [:ACTS_IN] relationship index
							  					rel.index('actsIn', 'id', rel.id, function() {})
							  					if(person.character != null) {
							  						rel.index('actsIn', 'character', person.character, function() {})
							  					}
							  				}
							  			})
			  						}

			  					})
			  				})
			  			} else {
			  				console.log('Casts list for movie with ID: ' + savedMovieNode.data.tmdbId + ' is null')
			  			}

			  			// Crew relations
			  			if(casts.crew != null) {
			  				casts.crew.forEach(function(person) {
			  					// Get person from index if possible
			  					db.getIndexedNode('person', 'tmdbId', person.id, function(err, personNode) {
									// Person node is not in index
			  						if(personNode == undefined) {
			  							var newPersonNode = db.createNode({
								  			tmdbId : person.id,
								  			name : (person.name != null) ? person.name : '',
								  			birthday : (person.birthday != null) ? person.birthday : '',
								  			biography : (person.biography != null) ? person.biography : '',
								  			profilePath : (person.profile_path != null) ? person.profile_path : ''
								  		})

			  							// Save person node
								  		newPersonNode.save(function(err, savedPersonNode) {
								  			// Index person node
								  			savedPersonNode.index('person', 'id', savedPersonNode.id, function() {})
								  			savedPersonNode.index('person', 'tmdbId', savedPersonNode.data.tmdbId, function() {})

								  			// Create [person :WORKS_IN movie] relationship
								  			savedPersonNode.createRelationshipTo(savedMovieNode, 'WORKS_IN', { department : (person.department != null) ? person.department : '', job : (person.job != null) ? person.job : '' }, function(err, rel) {
								  				if(err) {
								  					console.log('Works in relationship (Create new node): ' + err)
													console.log('------------------------------------------------------------------------')
													console.log('Person Node: ' + savedPersonNode.data)
								  				} else {
								  					// Create [:WORKS_IN] relationship index
								  					rel.index('worksIn', 'id', rel.id, function() {})
								  					if(person.department != null) {
								  						rel.index('worksIn', 'department', person.department, function() {})
								  					}
								  					if(person.job != null) {
								  						rel.index('worksIn', 'job', person.job, function() {})
								  					}
								  				}
								  				
								  			})
								  		})
			  						} else {
			  							// Create [person :WORKS_IN movie] relationship
			  							personNode.createRelationshipTo(savedMovieNode, 'WORKS_IN', { character : person.character }, function(err, rel) {
							  				if(err) {
							  					console.log('works in relationship (Get node from index): ' + err)
												console.log('------------------------------------------------------------------------')
												console.log('Person Node: ' + personNode)
							  				} else {
							  					// Create [:WORKS_IN] relationship index
							  					rel.index('worksIn', 'id', rel.id, function() {})
							  					if(person.department != null) {
							  						rel.index('worksIn', 'department', person.department, function() {})
							  					}
							  					if(person.job != null) {
							  						rel.index('worksIn', 'job', person.job, function() {})
							  					}
							  				}
							  			})
			  						}

			  					})
			  				})
			  			} else {
			  				console.log('Crew list for movie with ID: ' + savedMovieNode.data.tmdbId + ' is null')
			  			}
			  		})
	  			}
	  		})
	  	}
  	})
  	j++
}