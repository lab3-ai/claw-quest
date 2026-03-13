```markdown
API: checkretweet
curl: curl --request GET \
	--url https://twitter-api45.p.rapidapi.com/checkretweet.php \
	--header 'Content-Type: application/json' \
	--header 'x-rapidapi-host: twitter-api45.p.rapidapi.com' \
	--header 'x-rapidapi-key: 7439f2f10amsh4b5d861c8fd2b3dp1b1eb9jsn127d710a4ea0'
response: {
  "is_retweeted": true,
  "status": "ok"
}
```

```markdown
API: checkfollow
curl: curl --request GET \
	--url 'https://twitter-api45.p.rapidapi.com/checkretweet.php?screenname=vuong_lq99&tweet_id=2016877308632580542' \
	--header 'Content-Type: application/json' \
	--header 'x-rapidapi-host: twitter-api45.p.rapidapi.com' \
	--header 'x-rapidapi-key: 7439f2f10amsh4b5d861c8fd2b3dp1b1eb9jsn127d710a4ea0'
response: {
  "is_follow": true,
  "username": "vuong_lq99"
}
```

```json
API GET tweet
curl: curl --request GET \
	--url 'https://twitter-api45.p.rapidapi.com/tweet.php?id=2012155590513168718' \
	--header 'Content-Type: application/json' \
	--header 'x-rapidapi-host: twitter-api45.p.rapidapi.com' \
	--header 'x-rapidapi-key: 7439f2f10amsh4b5d861c8fd2b3dp1b1eb9jsn127d710a4ea0'
	
response: {
  "likes": 74,
  "created_at": "Fri Jan 16 13:30:51 +0000 2026",
  "status": "active",
  "text": "Tap it or miss it",
  "display_text": "Tap it or miss it",
  "urls": [],
  "retweets": 44,
  "bookmarks": 2,
  "quotes": 1,
  "reply_to": null,
  "replies": 22,
  "lang": "en",
  "in_reply_to_screen_name": null,
  "in_reply_to_status_id_str": null,
  "in_reply_to_user_id_str": null,
  "sensitive": false,
  "views": "6290",
  "conversation_id": "2012155590513168718",
  "entities": {
    "hashtags": [],
    "media": [
      {
        "display_url": "[pic.x.com/jsnKfikkEI](http://pic.x.com/jsnKfikkEI)",
        "expanded_url": "https://x.com/whalespredict/status/2012155590513168718/photo/1",
        "ext_media_availability": {
          "status": "Available"
        },
        "features": {
          "large": {
            "faces": [
              {
                "h": 74,
                "w": 74,
                "x": 1544,
                "y": 462
              }
            ]
          },
          "medium": {
            "faces": [
              {
                "h": 43,
                "w": 43,
                "x": 904,
                "y": 270
              }
            ]
          },
          "orig": {
            "faces": [
              {
                "h": 148,
                "w": 148,
                "x": 3088,
                "y": 924
              }
            ]
          },
          "small": {
            "faces": [
              {
                "h": 24,
                "w": 24,
                "x": 512,
                "y": 153
              }
            ]
          }
        },
        "id_str": "2012155291983564800",
        "indices": [
          18,
          41
        ],
        "media_key": "3_2012155291983564800",
        "media_results": {
          "result": {
            "media_key": "3_2012155291983564800"
          }
        },
        "media_url_https": "https://pbs.twimg.com/media/G-yck8OaUAAmHRG.jpg",
        "original_info": {
          "focus_rects": [
            {
              "h": 1441,
              "w": 2573,
              "x": 40,
              "y": 0
            },
            {
              "h": 1441,
              "w": 1441,
              "x": 606,
              "y": 0
            },
            {
              "h": 1441,
              "w": 1264,
              "x": 694,
              "y": 0
            },
            {
              "h": 1441,
              "w": 721,
              "x": 966,
              "y": 0
            },
            {
              "h": 1441,
              "w": 4096,
              "x": 0,
              "y": 0
            }
          ],
          "height": 1441,
          "width": 4096
        },
        "sizes": {
          "large": {
            "h": 721,
            "resize": "fit",
            "w": 2048
          },
          "medium": {
            "h": 422,
            "resize": "fit",
            "w": 1200
          },
          "small": {
            "h": 239,
            "resize": "fit",
            "w": 680
          },
          "thumb": {
            "h": 150,
            "resize": "crop",
            "w": 150
          }
        },
        "type": "photo",
        "url": "https://t.co/jsnKfikkEI"
      },
      {
        "display_url": "[pic.x.com/jsnKfikkEI](http://pic.x.com/jsnKfikkEI)",
        "expanded_url": "https://x.com/whalespredict/status/2012155590513168718/photo/1",
        "ext_media_availability": {
          "status": "Available"
        },
        "features": {
          "large": {
            "faces": []
          },
          "medium": {
            "faces": []
          },
          "orig": {
            "faces": []
          },
          "small": {
            "faces": []
          }
        },
        "id_str": "2012155318114111488",
        "indices": [
          18,
          41
        ],
        "media_key": "3_2012155318114111488",
        "media_results": {
          "result": {
            "media_key": "3_2012155318114111488"
          }
        },
        "media_url_https": "https://pbs.twimg.com/media/G-ycmdka0AAcsi9.jpg",
        "original_info": {
          "focus_rects": [
            {
              "h": 1441,
              "w": 2573,
              "x": 448,
              "y": 0
            },
            {
              "h": 1441,
              "w": 1441,
              "x": 1014,
              "y": 0
            },
            {
              "h": 1441,
              "w": 1264,
              "x": 1102,
              "y": 0
            },
            {
              "h": 1441,
              "w": 721,
              "x": 1374,
              "y": 0
            },
            {
              "h": 1441,
              "w": 4096,
              "x": 0,
              "y": 0
            }
          ],
          "height": 1441,
          "width": 4096
        },
        "sizes": {
          "large": {
            "h": 721,
            "resize": "fit",
            "w": 2048
          },
          "medium": {
            "h": 422,
            "resize": "fit",
            "w": 1200
          },
          "small": {
            "h": 239,
            "resize": "fit",
            "w": 680
          },
          "thumb": {
            "h": 150,
            "resize": "crop",
            "w": 150
          }
        },
        "type": "photo",
        "url": "https://t.co/jsnKfikkEI"
      },
      {
        "display_url": "[pic.x.com/jsnKfikkEI](http://pic.x.com/jsnKfikkEI)",
        "expanded_url": "https://x.com/whalespredict/status/2012155590513168718/photo/1",
        "ext_media_availability": {
          "status": "Available"
        },
        "features": {
          "large": {
            "faces": []
          },
          "medium": {
            "faces": []
          },
          "orig": {
            "faces": []
          },
          "small": {
            "faces": []
          }
        },
        "id_str": "2012155356286480384",
        "indices": [
          18,
          41
        ],
        "media_key": "3_2012155356286480384",
        "media_results": {
          "result": {
            "media_key": "3_2012155356286480384"
          }
        },
        "media_url_https": "https://pbs.twimg.com/media/G-ycorxa8AA3u-O.jpg",
        "original_info": {
          "focus_rects": [
            {
              "h": 1441,
              "w": 2573,
              "x": 652,
              "y": 0
            },
            {
              "h": 1441,
              "w": 1441,
              "x": 1218,
              "y": 0
            },
            {
              "h": 1441,
              "w": 1264,
              "x": 1306,
              "y": 0
            },
            {
              "h": 1441,
              "w": 721,
              "x": 1578,
              "y": 0
            },
            {
              "h": 1441,
              "w": 4096,
              "x": 0,
              "y": 0
            }
          ],
          "height": 1441,
          "width": 4096
        },
        "sizes": {
          "large": {
            "h": 721,
            "resize": "fit",
            "w": 2048
          },
          "medium": {
            "h": 422,
            "resize": "fit",
            "w": 1200
          },
          "small": {
            "h": 239,
            "resize": "fit",
            "w": 680
          },
          "thumb": {
            "h": 150,
            "resize": "crop",
            "w": 150
          }
        },
        "type": "photo",
        "url": "https://t.co/jsnKfikkEI"
      },
      {
        "display_url": "[pic.x.com/jsnKfikkEI](http://pic.x.com/jsnKfikkEI)",
        "expanded_url": "https://x.com/whalespredict/status/2012155590513168718/photo/1",
        "ext_media_availability": {
          "status": "Available"
        },
        "features": {
          "large": {
            "faces": []
          },
          "medium": {
            "faces": []
          },
          "orig": {
            "faces": []
          },
          "small": {
            "faces": []
          }
        },
        "id_str": "2012155382580514816",
        "indices": [
          18,
          41
        ],
        "media_key": "3_2012155382580514816",
        "media_results": {
          "result": {
            "media_key": "3_2012155382580514816"
          }
        },
        "media_url_https": "https://pbs.twimg.com/media/G-ycqNuaEAAFs13.jpg",
        "original_info": {
          "focus_rects": [
            {
              "h": 1441,
              "w": 2573,
              "x": 856,
              "y": 0
            },
            {
              "h": 1441,
              "w": 1441,
              "x": 1422,
              "y": 0
            },
            {
              "h": 1441,
              "w": 1264,
              "x": 1510,
              "y": 0
            },
            {
              "h": 1441,
              "w": 721,
              "x": 1782,
              "y": 0
            },
            {
              "h": 1441,
              "w": 4096,
              "x": 0,
              "y": 0
            }
          ],
          "height": 1441,
          "width": 4096
        },
        "sizes": {
          "large": {
            "h": 721,
            "resize": "fit",
            "w": 2048
          },
          "medium": {
            "h": 422,
            "resize": "fit",
            "w": 1200
          },
          "small": {
            "h": 239,
            "resize": "fit",
            "w": 680
          },
          "thumb": {
            "h": 150,
            "resize": "crop",
            "w": 150
          }
        },
        "type": "photo",
        "url": "https://t.co/jsnKfikkEI"
      }
    ],
    "symbols": [],
    "timestamps": [],
    "urls": [],
    "user_mentions": []
  },
  "initial_tweets": null,
  "author": {
    "rest_id": "2440149164",
    "name": "Whales Prediction",
    "screen_name": "whalespredict",
    "image": "https://pbs.twimg.com/profile_images/1999102390356570112/9DnAfI5q_normal.jpg",
    "blue_verified": true,
    "verification": null,
    "sub_count": 7043
  },
  "media": {
    "photo": [
      {
        "media_url_https": "https://pbs.twimg.com/media/G-yck8OaUAAmHRG.jpg",
        "id": "2012155291983564800"
      },
      {
        "media_url_https": "https://pbs.twimg.com/media/G-ycmdka0AAcsi9.jpg",
        "id": "2012155318114111488"
      },
      {
        "media_url_https": "https://pbs.twimg.com/media/G-ycorxa8AA3u-O.jpg",
        "id": "2012155356286480384"
      },
      {
        "media_url_https": "https://pbs.twimg.com/media/G-ycqNuaEAAFs13.jpg",
        "id": "2012155382580514816"
      }
    ]
  },
  "id": "2012155590513168718"
}
```