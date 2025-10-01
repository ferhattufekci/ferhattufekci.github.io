(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PortfolioPageAnimations = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  // Existing animation classes, extracted without changing their ordering.
  var animations = {
  "0": {
    "inClass": "",
    "outClass": ""
  },
  "1": {
    "inClass": "pt-page-moveFromRight",
    "outClass": "pt-page-moveToLeft"
  },
  "2": {
    "inClass": "pt-page-moveFromLeft",
    "outClass": "pt-page-moveToRight"
  },
  "3": {
    "inClass": "pt-page-moveFromBottom",
    "outClass": "pt-page-moveToTop"
  },
  "4": {
    "inClass": "pt-page-moveFromTop",
    "outClass": "pt-page-moveToBottom"
  },
  "5": {
    "inClass": "pt-page-moveFromRight pt-page-ontop",
    "outClass": "pt-page-fade"
  },
  "6": {
    "inClass": "pt-page-moveFromLeft pt-page-ontop",
    "outClass": "pt-page-fade"
  },
  "7": {
    "inClass": "pt-page-moveFromBottom pt-page-ontop",
    "outClass": "pt-page-fade"
  },
  "8": {
    "inClass": "pt-page-moveFromTop pt-page-ontop",
    "outClass": "pt-page-fade"
  },
  "9": {
    "inClass": "pt-page-moveFromRightFade",
    "outClass": "pt-page-moveToLeftFade"
  },
  "10": {
    "inClass": "pt-page-moveFromLeftFade",
    "outClass": "pt-page-moveToRightFade"
  },
  "11": {
    "inClass": "pt-page-moveFromBottomFade",
    "outClass": "pt-page-moveToTopFade"
  },
  "12": {
    "inClass": "pt-page-moveFromTopFade",
    "outClass": "pt-page-moveToBottomFade"
  },
  "13": {
    "inClass": "pt-page-moveFromRight",
    "outClass": "pt-page-moveToLeftEasing pt-page-ontop"
  },
  "14": {
    "inClass": "pt-page-moveFromLeft",
    "outClass": "pt-page-moveToRightEasing pt-page-ontop"
  },
  "15": {
    "inClass": "pt-page-moveFromBottom",
    "outClass": "pt-page-moveToTopEasing pt-page-ontop"
  },
  "16": {
    "inClass": "pt-page-moveFromTop",
    "outClass": "pt-page-moveToBottomEasing pt-page-ontop"
  },
  "17": {
    "inClass": "pt-page-moveFromRight pt-page-ontop",
    "outClass": "pt-page-scaleDown"
  },
  "18": {
    "inClass": "pt-page-moveFromLeft pt-page-ontop",
    "outClass": "pt-page-scaleDown"
  },
  "19": {
    "inClass": "pt-page-moveFromBottom pt-page-ontop",
    "outClass": "pt-page-scaleDown"
  },
  "20": {
    "inClass": "pt-page-moveFromTop pt-page-ontop",
    "outClass": "pt-page-scaleDown"
  },
  "21": {
    "inClass": "pt-page-scaleUpDown pt-page-delay300",
    "outClass": "pt-page-scaleDown"
  },
  "22": {
    "inClass": "pt-page-scaleUp pt-page-delay300",
    "outClass": "pt-page-scaleDownUp"
  },
  "23": {
    "inClass": "pt-page-scaleUp",
    "outClass": "pt-page-moveToLeft pt-page-ontop"
  },
  "24": {
    "inClass": "pt-page-scaleUp",
    "outClass": "pt-page-moveToRight pt-page-ontop"
  },
  "25": {
    "inClass": "pt-page-scaleUp",
    "outClass": "pt-page-moveToTop pt-page-ontop"
  },
  "26": {
    "inClass": "pt-page-scaleUp",
    "outClass": "pt-page-moveToBottom pt-page-ontop"
  },
  "27": {
    "inClass": "pt-page-scaleUpCenter pt-page-delay400",
    "outClass": "pt-page-scaleDownCenter"
  },
  "28": {
    "inClass": "pt-page-moveFromRight pt-page-delay200 pt-page-ontop",
    "outClass": "pt-page-rotateRightSideFirst"
  },
  "29": {
    "inClass": "pt-page-moveFromLeft pt-page-delay200 pt-page-ontop",
    "outClass": "pt-page-rotateLeftSideFirst"
  },
  "30": {
    "inClass": "pt-page-moveFromTop pt-page-delay200 pt-page-ontop",
    "outClass": "pt-page-rotateTopSideFirst"
  },
  "31": {
    "inClass": "pt-page-moveFromBottom pt-page-delay200 pt-page-ontop",
    "outClass": "pt-page-rotateBottomSideFirst"
  },
  "32": {
    "inClass": "pt-page-flipInLeft pt-page-delay500",
    "outClass": "pt-page-flipOutRight"
  },
  "33": {
    "inClass": "pt-page-flipInRight pt-page-delay500",
    "outClass": "pt-page-flipOutLeft"
  },
  "34": {
    "inClass": "pt-page-flipInBottom pt-page-delay500",
    "outClass": "pt-page-flipOutTop"
  },
  "35": {
    "inClass": "pt-page-flipInTop pt-page-delay500",
    "outClass": "pt-page-flipOutBottom"
  },
  "36": {
    "inClass": "pt-page-scaleUp",
    "outClass": "pt-page-rotateFall pt-page-ontop"
  },
  "37": {
    "inClass": "pt-page-rotateInNewspaper pt-page-delay500",
    "outClass": "pt-page-rotateOutNewspaper"
  },
  "38": {
    "inClass": "pt-page-moveFromRight",
    "outClass": "pt-page-rotatePushLeft"
  },
  "39": {
    "inClass": "pt-page-moveFromLeft",
    "outClass": "pt-page-rotatePushRight"
  },
  "40": {
    "inClass": "pt-page-moveFromBottom",
    "outClass": "pt-page-rotatePushTop"
  },
  "41": {
    "inClass": "pt-page-moveFromTop",
    "outClass": "pt-page-rotatePushBottom"
  },
  "42": {
    "inClass": "pt-page-rotatePullRight pt-page-delay180",
    "outClass": "pt-page-rotatePushLeft"
  },
  "43": {
    "inClass": "pt-page-rotatePullLeft pt-page-delay180",
    "outClass": "pt-page-rotatePushRight"
  },
  "44": {
    "inClass": "pt-page-rotatePullBottom pt-page-delay180",
    "outClass": "pt-page-rotatePushTop"
  },
  "45": {
    "inClass": "pt-page-rotatePullTop pt-page-delay180",
    "outClass": "pt-page-rotatePushBottom"
  },
  "46": {
    "inClass": "pt-page-moveFromRightFade",
    "outClass": "pt-page-rotateFoldLeft"
  },
  "47": {
    "inClass": "pt-page-moveFromLeftFade",
    "outClass": "pt-page-rotateFoldRight"
  },
  "48": {
    "inClass": "pt-page-moveFromBottomFade",
    "outClass": "pt-page-rotateFoldTop"
  },
  "49": {
    "inClass": "pt-page-moveFromTopFade",
    "outClass": "pt-page-rotateFoldBottom"
  },
  "50": {
    "inClass": "pt-page-rotateUnfoldLeft",
    "outClass": "pt-page-moveToRightFade"
  },
  "51": {
    "inClass": "pt-page-rotateUnfoldRight",
    "outClass": "pt-page-moveToLeftFade"
  },
  "52": {
    "inClass": "pt-page-rotateUnfoldTop",
    "outClass": "pt-page-moveToBottomFade"
  },
  "53": {
    "inClass": "pt-page-rotateUnfoldBottom",
    "outClass": "pt-page-moveToTopFade"
  },
  "54": {
    "inClass": "pt-page-rotateRoomLeftIn",
    "outClass": "pt-page-rotateRoomLeftOut pt-page-ontop"
  },
  "55": {
    "inClass": "pt-page-rotateRoomRightIn",
    "outClass": "pt-page-rotateRoomRightOut pt-page-ontop"
  },
  "56": {
    "inClass": "pt-page-rotateRoomTopIn",
    "outClass": "pt-page-rotateRoomTopOut pt-page-ontop"
  },
  "57": {
    "inClass": "pt-page-rotateRoomBottomIn",
    "outClass": "pt-page-rotateRoomBottomOut pt-page-ontop"
  },
  "58": {
    "inClass": "pt-page-rotateCubeLeftIn",
    "outClass": "pt-page-rotateCubeLeftOut pt-page-ontop"
  },
  "59": {
    "inClass": "pt-page-rotateCubeRightIn",
    "outClass": "pt-page-rotateCubeRightOut pt-page-ontop"
  },
  "60": {
    "inClass": "pt-page-rotateCubeTopIn",
    "outClass": "pt-page-rotateCubeTopOut pt-page-ontop"
  },
  "61": {
    "inClass": "pt-page-rotateCubeBottomIn",
    "outClass": "pt-page-rotateCubeBottomOut pt-page-ontop"
  },
  "62": {
    "inClass": "pt-page-rotateCarouselLeftIn",
    "outClass": "pt-page-rotateCarouselLeftOut pt-page-ontop"
  },
  "63": {
    "inClass": "pt-page-rotateCarouselRightIn",
    "outClass": "pt-page-rotateCarouselRightOut pt-page-ontop"
  },
  "64": {
    "inClass": "pt-page-rotateCarouselTopIn",
    "outClass": "pt-page-rotateCarouselTopOut pt-page-ontop"
  },
  "65": {
    "inClass": "pt-page-rotateCarouselBottomIn",
    "outClass": "pt-page-rotateCarouselBottomOut pt-page-ontop"
  },
  "66": {
    "inClass": "pt-page-rotateSidesIn pt-page-delay200",
    "outClass": "pt-page-rotateSidesOut"
  },
  "67": {
    "inClass": "pt-page-rotateSlideIn",
    "outClass": "pt-page-rotateSlideOut"
  }
};
  return {
    get: function (index) {
      if (!Number.isInteger(index) || index < 0 || index > 67) return null;
      var entry = animations[index];
      return entry ? { inClass: entry.inClass, outClass: entry.outClass } : null;
    }
  };
});
