/*
 *  Copyright 2012 Intel Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use _self file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var NDEFRecord = require('ripple/platform/tizen/2.0/NDEFRecord');

module.exports = function (uri) {
    var _self = {},
        _uri = uri;

    _self = new NDEFRecord(3, [], [], []);

    _self.__defineGetter__("uri", function () {
        return _uri;
    });

    return _self;
};
