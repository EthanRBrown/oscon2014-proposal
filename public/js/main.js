$(document).ready(function(){

	$('button[data-action="logout"]').on('click', function(){
		window.location = '/logout?redirect=' + encodeURIComponent( window.location.pathname + window.location.search );
	});

	$('button[data-action="login"]').on('click', function(){
		window.location = '/auth/twitter?redirect=' + encodeURIComponent( window.location.pathname + window.location.search );
	});

	$('button[data-action="vote"]').on('click', function(){
		window.location = '/vote?proposal=' + encodeURIComponent( window.location.pathname );
	});

	$('button[data-action="unvote"]').on('click', function(){
		window.location = '/unvote?proposal=' + encodeURIComponent( window.location.pathname );
	});

});
