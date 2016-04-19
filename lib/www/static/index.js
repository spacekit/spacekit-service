/* global $, alert */
'use strict';

// testing or live?
var baseUrl = 'https://api.spacekit.io';
if (window.location.hostname === 'www.dev.spacekit.io') {
  baseUrl = 'https://api.dev.spacekit.io';
}

function signupFormHandler (event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  var username = $('#signup-form [name="username"]').val();
  var email = $('#signup-form [name="email"]').val();

  $.ajax({
    type: 'POST',
    url: baseUrl + '/signup',
    crossDomain: true,
    data: {
      username: username,
      email: email
    },
    dataType: 'json',
    success: function (response, textStatus, jqXHR) {
      if (response.success) {
        $('.signup-step-1').hide();
        $('.signup-step-2').show();
        $('.signup-step-2 .signup-username').text(username);
        $('.signup-step-2 .signup-api-key').text(response.apiKey);
      } else {
        response.errors.forEach(function (error) {
          alert(error);
        });
      }
    },
    error: function (response, textStatus, errorThrown) {
      if (response.responseJSON && response.responseJSON.errors) {
        response.responseJSON.errors.forEach(function (error) {
          alert(error);
        });
      } else {
        alert('Sorry, there was a server error.');
      }
    }
  });
}

function recoverFormHandler (event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  alert('hi recover');
}

function rotateRelayExamples () {
  var options = [
    'home', 'work', 'laptop',
    'raspi', 'kitchen', 'patio',
    'livecam'
  ];
  var current = 0;
  var $relay = $('#signup-form .relay');

  setInterval(function () {
    $relay.text(options[current] + '.');

    current += 1;
    if (current >= options.length) {
      current = 0;
    }
  }, 1500);
}

// start rotating relays
rotateRelayExamples();

// bind events
$('#signup-form button').click(signupFormHandler);
$('#recover-form button').click(recoverFormHandler);

// focus on signup form
$('#signup-form [name="username"]').focus();
