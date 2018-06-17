#! /usr/bin/env python
# -*- coding: utf-8 -*-

import sys
from requests import request
import json
from base64 import b64encode
import time

login_data = {
    "mail": "darkfader@gmail.com",
    "password": "mypassword",
    "device": 2,
    "version": "2.0.1",
}

headers = {
    'Host': '54.213.170.33:8999',
    'Content-Type': 'application/json;charset=UTF-8',
    'User-Agent': 'okhttp/3.9.0',
    'Accept': 'application/json, application/*+json',
    'lang': 'en',
    'Authorization': '',        # Basic b64encode('darkfader:pass')
}


def api_request(method, path, data=None):
    if data is not None:
        data = json.dumps(data)
    r = json.loads(request(method=method, url="http://54.213.170.33:8999/api/v1/" + path, headers=headers, data=data).text)

    if 'status' in r:
        if r['status'] != 1:
            message = None
            if 'devMessage' in r:
                message = r['devMessage']
            elif 'message' in r:
                message = r['message']
            print >> sys.stderr, "Error:", r['status'], message
    if 'data' in r:
        return r['data']
    else:
        print r
        return r


def login():
    return api_request('post', "users/actions/login", login_data)

def change_password(mail, oldPassword, newPassword):
    return api_request('patch', "users/actions/login", {'mail':mail, 'oldPassword':oldPassword, 'newPassword':newPassword})

def update_location(latitude, longitude, userUuid):
    return api_request('put', "users/actions/updateLocation", {
        'latitude':str(latitude), 'longitude':str(longitude), 'userUuid':userUuid
    })
    # URL http://54.213.170.33:8999/api/v1/users/actions/updateLocation
    # {"latitude":"52.011468","userUuid":"92403255380f4066a094398cffba6a1f","longitude":"4.713862"}
    # {"status":1,"message":"API调用成功"}



def get_unlock_records(userUuid):
    return api_request('get', "unlock_records/bluetooth/%s?page=1&size=100" % (userUuid))
    # {u'status': 1, u'message': u'API\u8c03\u7528\u6210\u529f', u'data': {u'totalCount': 19, u'totalPage': 2, u'list': [{u'imageUrl': None, u'lockName': u'Gray', u'timeText': u'50 minutes ago', u'firstName': u'Rafael', u'location': u'Groeneweg 17A, 2801 ZA Gouda, Nederland'}, {u'imageUrl': None, u'lockName': u'Gray', u'timeText': u'1 hours ago', u'firstName': u'Rafael', u'location': u'Groeneweg 17A, 2801 ZA Gouda, Nederland'}, {u'imageUrl': None, u'lockName': u'Gray', u'timeText': u'2 days ago', u'firstName': u'Rafael', u'location': u'Groeneweg 17A, 2801 ZA Gouda, Nederland'}, {u'imageUrl': None, u'lockName': u'Gray', u'timeText': u'2 days ago', u'firstName': u'Rafael', u'location': u'Groeneweg 17A, 2801 ZA Gouda, Nederland'}, {u'imageUrl': None, u'lockName': u'Gray', u'timeText': u'2 days ago', u'firstName': u'Rafael', u'location': u'Groeneweg 17A, 2801 ZA Gouda, Nederland'}, {u'imageUrl': None, u'lockName': u'Gray', u'timeText': u'2 days ago', u'firstName': u'Rafael', u'location': u'Groeneweg 17A, 2801 ZA Gouda, Nederland'}, {u'imageUrl': None, u'lockName': u'Gray', u'timeText': u'2 days ago', u'firstName': u'Rafael', u'location': u'Groeneweg 17A, 2801 ZA Gouda, Nederland'}, {u'imageUrl': None, u'lockName': u'Gray', u'timeText': u'2 days ago', u'firstName': u'Rafael', u'location': u'Groeneweg 17A, 2801 ZA Gouda, Nederland'}, {u'imageUrl': None, u'lockName': u'Gray', u'timeText': u'2 days ago', u'firstName': u'Rafael', u'location': u'Groeneweg 17A, 2801 ZA Gouda, Nederland'}, {u'imageUrl': None, u'lockName': u'Gray', u'timeText': u'2 days ago', u'firstName': u'Rafael', u'location': u'Groeneweg 17A, 2801 ZA Gouda, Nederland'}], u'pageSize': 10, u'pageCurrent': 1}}

def post_unlock(lockId, userUuid):
    return api_request('post', "unlock_records/bluetooth", {"lockId": lockId, "userUuid": userUuid})

def get_fingerprint_records(userUuid):
    return api_request('get', 'unlock_records/fingerprints/%s?page=2&size=100' % (userUuid))
#     {
#     "status": 1,
#     "message": "API调用成功",
#     "data": {
#         "list": [{
#             "fingerOwnerName": "Rafael Vuijk",
#             "lockName": "TL104A"
#         }],
#         "totalCount": 11,
#         "totalPage": 2,
#         "pageCurrent": 2,
#         "pageSize": 10
#     }
# }


def get_my_shares(mail):
    return api_request('get', "shares/%s?page=1&size=100" % (mail))

def delete_share(id):
    return api_request('delete', "shares/%s" % (id))

def get_locks_shared_with_me(mail):
    return api_request('get', "locks/%s?myOwner=false&page=1&size=100" % (mail))

def get_my_locks(mail):
    return api_request('get', "locks/%s?myOwner=true&page=1&size=100" % (mail))

def share_permanent(lockId, toUserMail, userUuid):
    return api_request('post', "shares", data={
        "lockId":lockId,"oneAccess":0,"permanent":1,"toUserMail":toUserMail,"userUuid":userUuid
    })

# def share_once(:
#   'post' {"endDate":"1519590346","lockId":19023,"oneAccess":1,"permanent":0,"startDate":"1519503944","toUserMail":"tome@...","userUuid":"92403255380f4066a094398cffba6a1f"}

def add_shared_user(mail, name, userUuid):
    return api_request('post', "shareable_users", {'mail': mail, 'nickName': name, 'userUuid': userUuid})

# def patch_shared_user():
#     return api_request('patch', "shareable_users", {"shareableUserId": 4358, "nickName": "Rafael Vuijk"})

def feedback(title, content):
    return api_request('post', "feedbacks", data={"title":title, "content":content})



def get_finger_owners(userUuid):
    return api_request('get', "finger_owners/%s?page=1&size=100" % (userUuid))

def post_finger(lockId, userUuid, mail):
    return api_request('post', "fingers", {
        "fingerOwner": '4951d9cccbe34a13b6f34a0e0a1a0c3e',
        "fingerType": 1,
        "fingerprintIndex": "0100",
        "handType": 2,
        "lockId": lockId,
        "mail": mail,
    })

def get_fingers(lockId):
    return api_request('get', "fingers/%s?page=1&size=100" % (lockId))

def delete_lock(lockId):
    return api_request('delete', "locks/%s" % lockId)

def post_lock(userUuid, serialNo, mac, key1, key2):
    return api_request('post', "locks", {
        "imageUrl": "Placeholder_B_ji9qnx",
        "key1": key1,
        "key2": key2,
        "lockName": "TL104A",
        "mac": mac,
        "serialNo": serialNo,
        "userUuid": userUuid,
    })


fingerTypeNames = { 1:'thumb', 2:'index', 3:'middle', 4:'ring', 5:'little' }
handTypeNames = { 1:'left', 2:'right' }


############
# test... (yeah.. it's actually in the same file for now...)


login_result_data = login()
headers['Authorization'] = login_result_data['basicToken']

finger_owners = get_finger_owners(login_result_data['uuid'])
for owner in finger_owners['list']:
    print owner['uuid'], owner['ownerName']

my_locks_results = get_my_locks(login_result_data['mail'])
print my_locks_results
for lock in my_locks_results['list']:
    print lock['id'], lock['lockName']
    for owner in get_fingers(lock['id'])['list']:
        for fingerprint in owner['fingerprintList']:
            print owner['ownerName'], fingerprint['id'], handTypeNames[fingerprint['handType']], fingerTypeNames[fingerprint['fingerType']]
    #post_finger(lock['id'], login_result_data['uuid'], login_result_data['mail'])


# update_location(43.651232, -79.3845077, login_result_data['uuid'])
# post_unlock(1, login_result_data['uuid'])
# post_unlock(2, login_result_data['uuid'])
# post_unlock(3, login_result_data['uuid'])
# post_unlock(4, login_result_data['uuid'])
# post_unlock(5, login_result_data['uuid'])
# post_unlock(6, login_result_data['uuid'])
# post_unlock(7, login_result_data['uuid'])
# post_unlock(8, login_result_data['uuid'])

locks_result = get_my_locks(login_result_data["mail"])
print locks_result


if False:
    print "deleting locks..."

    for lock in locks_result['list']:
        delete_lock(lock['id'])


if False:
    while True:
        print "posting locks..."
        # working
        post_lock(login_result_data['uuid'], serialNo='b55908d0', mac='de:44:b3:69:30:c2', key1='11111111', key2='22222222')
        post_lock(login_result_data['uuid'], serialNo='908A2077', mac='16:81:71:69:93:e5', key1='11111111', key2='22222222')

        time.sleep(300)


# shares_result = get_my_shares(login_result_data["mail"])
# print shares_result


#unlock_records_result = get_unlock_records(login_result_data['uuid'])
# unlock_records_result = get_unlock_records('935fe9eee2674242b57741cedb64bf67')
# print unlock_records_result

# print get_fingers(18821)

# for lock in get_locks_shared_with_me(login_result_data["mail"])['list']:
#     print lock
    #print lock['shareUuid']
    #delete_share(lock['shareUuid'])


# delete all shares
# for share in shares_result['list']:
#     delete_share(share['id'])

# share random locks :)      Luckily they fixed it after I reported it...
# for id in reversed(range(10000,12650)):
#      print id
#      share_permanent(lockId=id, toUserMail="secondaccount@somewhere", userUuid=login_result_data['uuid'])
