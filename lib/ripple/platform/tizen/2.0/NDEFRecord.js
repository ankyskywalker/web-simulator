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

module.exports = function (tnf, type, payload, id) {
    var _self = {},
        _tnf = tnf,
        _type = type,
        _id = id || [],
        _payload = payload;

    _self.__defineGetter__("tnf", function () {
        return _tnf;
    });

    _self.__defineGetter__("type", function () {
        return _type;
    });

    _self.__defineGetter__("id", function () {
        return _id;
    });

    _self.__defineGetter__("payload", function () {
        return _payload;
    });
    return _self;
};
