/*
 *  Copyright 2013 Intel Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
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

var db = require('ripple/db'),
    utils = require('ripple/utils'),
    t = require('ripple/platform/tizen/2.0/typecast'),
    errorcode = require('ripple/platform/tizen/2.0/errorcode'),
    WebAPIException = require('ripple/platform/tizen/2.0/WebAPIException'),
    BookmarkFolder = require('ripple/platform/tizen/2.0/BookmarkFolder'),
    BookmarkItem = require('ripple/platform/tizen/2.0/BookmarkItem'),
    BookmarkExternal,
    BookmarkInternal,
    BookmarkStorage,
    _data = {
        DB_BOOKMARK_KEY: "tizen1-bookmark",
        bookmarks:       [],
        dbStorage:       []
    },
    _security = {
        "http://tizen.org/privilege/bookmark.read": ["get"],
        "http://tizen.org/privilege/bookmark.write": ["add", "remove"],
        all: true
    },
    _self;

function _get() {
    _data.dbStorage = db.retrieveObject(_data.DB_BOOKMARK_KEY) || [];
}

function _save() {
    db.saveObject(_data.DB_BOOKMARK_KEY, _data.dbStorage);
}

function _initialize() {
    _get();

    utils.forEach(_data.dbStorage, function (bookmark) {
        _data.bookmarks.push(new BookmarkInternal(bookmark, null));
    });
}

function _persist() {
    _data.dbStorage = [];

    utils.forEach(_data.bookmarks, function (bookmark) {
        _data.dbStorage.push(new BookmarkStorage(bookmark));
    });

    _save();
}

function _isFolder(bookmark) {
    return !bookmark.url;
}

function _isExternal(bookmark) {
    return !("children" in bookmark);
}

function _getChildren(bookmark, BookmarkType, parent) {
    var i, children = [];

    if (!_isExternal(bookmark)) {
        for (i in bookmark.children) {
            children.push(new BookmarkType(bookmark.children[i], parent));
        }
    }

    return children;
}

_self = function () {
    var bookmark;

    // private
    /*
     * map
     *    Map the external bookmark to the internal one in the tree
     *
     * bookmarkExternal
     *    External bookmark Object
     *
     * callback
     *    callback(index, peers). Optional.
     *
     *          Root    Bookmark        Not Found
     * ------------------------------------------
     *  index   0       index           -1
     *  peers   null    peers           null
     *
     * Return   null    peers[index]    undefined
     */

    function map(bookmarkExternal, callback) {
        var trace = [], it, i, peers = null;

        if (!bookmarkExternal) {
            if (callback) {
                callback(0, null);
            }
            return null;
        }

        for (it = bookmarkExternal; it; it = it.parent) {
            trace.push(it);
        }

        for (it = _data.bookmarks; trace.length !== 0; it = it[i].children) {
            bookmarkExternal = trace.pop();
            peers = null;

            for (i in it) {
                if (it[i].external === bookmarkExternal) {
                    peers = it;
                    break;
                }
            }
        }

        if (callback) {
            return callback((peers !== null) ? i : -1, peers);
        }

        return (peers !== null) ? peers[i] : undefined;
    }

    function traverse(bookmarks, trace, level) {
        for (var i in bookmarks) {
            trace.push(bookmarks[i].external);
            if ((level !== 0) && bookmarks[i].children) {
                traverse(bookmarks[i].children, trace, --level);
            }
        }
    }

    function isExisting(bookmark, peers) {
        var i;

        for (i in peers) {
            if ((peers[i].title === bookmark.title) &&
                (_isFolder(peers[i]) === _isFolder(bookmark))) {
                return true;
            }
        }

        return false;
    }

    // public
    function get(parentFolder, recursive) {
        var bookmarks = [], parent, peers;

        if (!_security.all && !_security.get) {
            throw new WebAPIException(errorcode.SECURITY_ERR);
        }

        parentFolder = t.BookmarkFolder(parentFolder, "?");
        recursive = t.boolean(recursive, "?");

        parent = map(parentFolder);
        if ((parent === undefined) || (parent && !_isFolder(parent))) {
            throw new WebAPIException(errorcode.NOT_FOUND_ERR);
        }
        peers = parent ? parent.children : _data.bookmarks;
        traverse(peers, bookmarks, recursive ? -1 : 0);

        return bookmarks;
    }

    function add(bookmark, parentFolder) {
        var parent, peers;

        if (!_security.all && !_security.add) {
            throw new WebAPIException(errorcode.SECURITY_ERR);
        }

        bookmark = t.Bookmark(bookmark);
        parentFolder = t.BookmarkFolder(parentFolder, "?");

        parent = map(parentFolder);
        if ((parent === undefined) || (parent && !_isFolder(parent))) {
            throw new WebAPIException(errorcode.NOT_FOUND_ERR);
        }
        peers = parent ? parent.children : _data.bookmarks;
        if (isExisting(bookmark, peers)) {
            throw new WebAPIException(errorcode.UNKNOWN_ERR);
        }

        peers.push(new BookmarkInternal(bookmark));

        _persist();

        bookmark.__defineGetter__("parent", function () {
            return parent ? parent.external : null;
        });
    }

    function remove(bookmark) {
        if (!_security.all && !_security.remove) {
            throw new WebAPIException(errorcode.SECURITY_ERR);
        }

        bookmark = t.Bookmark(bookmark, "?");

        if (!bookmark) {
            _data.bookmarks = [];
        } else {
            map(bookmark, function (index, peers) {
                if (index === -1) {
                    throw new WebAPIException(errorcode.NOT_FOUND_ERR);
                }
                peers.splice(index, 1);
            });
        }

        _persist();
    }

    function handleSubFeatures(subFeatures) {
        var i, subFeature;

        for (subFeature in subFeatures) {
            if (_security[subFeature].length === 0) {
                _security.all = true;
                return;
            }
            _security.all = false;
            for (i in _security[subFeature]) {
                _security[_security[subFeature][i]] = true;
            }
        }
    }

    bookmark = {
        get:               get,
        add:               add,
        remove:            remove,
        handleSubFeatures: handleSubFeatures
    };

    return bookmark;
};

/*
 * BookmarkInternal     BookmarkStorage     BookmarkExternal
 * ---------------------------------------------------------
 * title                title               title
 * url                  url                 url/-
 * children             children            -
 * external             -                   -
 * -                    -                   parent
 */

BookmarkInternal = function (bookmark, parent) {
    this.title    = bookmark.title;
    this.url      = _isFolder(bookmark) ? null : bookmark.url;
    this.children = _isFolder(bookmark) ?
        _getChildren(bookmark, BookmarkInternal, this) : null;
    this.external = _isExternal(bookmark) ? bookmark :
        new BookmarkExternal(bookmark, parent);
};

BookmarkStorage = function (bookmark) {
    this.title    = bookmark.title;
    this.url      = _isFolder(bookmark) ? null : bookmark.url;
    this.children = _isFolder(bookmark) ?
        _getChildren(bookmark, BookmarkStorage) : null;
};

BookmarkExternal = function (bookmark, parent) {
    var self;

    if (_isFolder(bookmark)) {
        self = new BookmarkFolder(bookmark.title);
    } else {
        self = new BookmarkItem(bookmark.title, bookmark.url);
    }

    self.__defineGetter__("parent", function () {
        return parent ? parent.external : null;
    });

    return self;
};

_initialize();

module.exports = _self;
