import json
import os

import functools
import requests

from bson import BSON
from bson import json_util
from flask_pymongo import PyMongo
from flask import Flask, render_template, redirect, request, Response, session, url_for, flash

app = Flask(__name__)

app.config['MONGO_URI'] = 'mongodb+srv://cellafm:hfSC7JfSdDOJtEMO@cellafm-iz32p.mongodb.net/test?retryWrites=true&w=majority'
app.config['MONGO_PASS'] = "hfSC7JfSdDOJtEMO"
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['ADMIN_PASSWORD'] = 'burialuntrue'

mongo = PyMongo(app)

UPLOAD_FOLDER = 'static/uploads'
ADMIN_PASSWORD = "burialuntrue"
SITE_ROOT = os.path.realpath(os.path.dirname(__file__))

app.secret_key = 'qergtdyujfaegrhtwejyrgy'

def check_auth(password):
    if password == ADMIN_PASSWORD:
        return True
    return False


def requires_admin(f):
    @functools.wraps(f)
    def decorated(*args, **kws):
        status = session.get('admin')
        if not status:
            return render_template('login.html'), 200
        return f(*args, **kws)
    return decorated

def getData(url):
    return json.load(requests.get(url).content)

def getCurrentShowDetails():
    liveInfo = mongo.db.live.find_one('current')
    
    SITE_ROOT = os.path.realpath(os.path.dirname(__file__))
    json_url = os.path.join(SITE_ROOT, "static/data", "currentshow.json")
    return json.load(open(json_url))

def getArtists():
    artists = mongo.db.artists
    return json_util.dumps(artists.find({}))

def getArtistByName(name):
    artists = mongo.db.artists
    return json_util.dumps(artists.find_one({'name': name}))

def getArtistByID(ident):
    artists = mongo.db.artists
    return json_util.dumps(artists.find_one({'_id': ident}))

def alreadyExists(name):
    return bool(mongo.db.artists.find_one({'name': name}))

# PUBLIC ROUTING

@app.route('/') 
def basePage():
    return render_template('base.html')

@app.route('/home')
def mainPage():
    return render_template('main.html'), 200

@app.route('/about')
def pageabout():
    return render_template('about.html'), 200

@app.route('/residents')
def residentsPage():
    return render_template('residents.html', data=json.loads(getArtists())), 200

@app.route('/resident/<name>')
def resPage(name):
    print(name)
    if alreadyExists(name):
        print("User found!")
        artist = getArtistByName(name)
        print(artist)
        return render_template('resident.html', artist=json.loads(artist)), 200
    print("User not found!")
    return render_template('residents.html', data=json.loads(getArtists())), 200
    
# API ROUTING

@app.route('/api/currentshow')
def currentShow():
    return getCurrentShowDetails()


@app.route('/api/residents')
def getResidents():
    data = getArtists()
    return data

@app.route('/api/resident/<name>')
@requires_admin
def getArtist(name):
    if alreadyExists(name):
        print("Artist Found!")
        return getArtistByName(name)
    
    print("Artist not found")
        
    return render_template('admin.html', data=getCurrentShowDetails(), artists=json.loads(getArtists())), 200



@app.route('/api/edit', methods=['GET', 'POST'])
def editRes():
    if request.method == 'POST':
        name = request.form['name']
        description = request.form['description']
        header = request.form['header']
        newFileName = name.replace(' ', '_')
        
        
        if 'image' in request.files:
            print("file not found")
            file = request.files['image'] 
            
            if file.filename == '':
                print("file not uploaded")
            else:
                file = request.files['image']
                if file:
                    SITE_ROOT = os.path.realpath(os.path.dirname(__file__))
                    file.filename = newFileName
                    file.save(os.path.join(UPLOAD_FOLDER, newFileName + ".jpg"))
        
        artists = mongo.db.artists
        artist = {
            'name': name,
            'header': header,
            'description': description,
            'img': newFileName
        }
        
        artists.update_one({"name": name}, {"$set": artist})
        
    return render_template('admin.html', data=getCurrentShowDetails(), artists=json.loads(getArtists())), 200



@app.route('/api/add', methods=['GET', 'POST'])
@requires_admin
def addRes():
    if request.method == 'POST':
        name = request.form['name']
        description = request.form['description']
        header = request.form['header']
        newFileName = name.replace(' ', '_')
        
        if 'image' not in request.files:
            print("file not found")
            flash("No file was uploaded!")
            return render_template('admin.html', data=getCurrentShowDetails(), artists=json.loads(getArtists())), 200 
        
        file = request.files['image']
        
        if file.filename == '':
            print("file not uploaded")
            flash("No file was uploaded!")
            return render_template('admin.html', data=getCurrentShowDetails(), artists=json.loads(getArtists())), 200 
        
        if file:
            SITE_ROOT = os.path.realpath(os.path.dirname(__file__))
            file.filename = newFileName
            file.save(os.path.join(UPLOAD_FOLDER, newFileName + ".jpg"))
            
            
        artists = mongo.db.artists
        artist = {
            'name': name,
            'header': header,
            'description': description,
            'img': newFileName
        }
        artists.insert_one(artist).inserted_id
        
        flash("Uploaded new Artist! ")
        
        return render_template('admin.html', data=getCurrentShowDetails(), artists=json.loads(getArtists()))

    
    
@app.route('/api/delete/<name>')
@requires_admin
def deleteArtist(name):
    if alreadyExists(name):
        artists = mongo.db.artists
        artists.delete_one({'name' : name})
        flash("Artist " + name + " has been deleted!")
    return render_template('admin.html', data=getCurrentShowDetails(), artists=json.loads(getArtists()))

    
    
    
@app.route('/admin')
@requires_admin
def adminPage():
    return render_template('admin.html', data=getCurrentShowDetails(), artists=json.loads(getArtists())), 200



@app.route('/login', methods=['GET', 'POST'])
def loginPage():
    if request.method == 'POST':
        data = request.get_json()
        password = data['password']
        if check_auth(password):
            print("password match!")
            session['admin'] = True
            return render_template('admin.html', data=getCurrentShowDetails(), artists=json.loads(getArtists())), 200 
        else:
            print("password didn't match!")
            flash("Error with authentication!")
            render_template('login.html'), 401
    return render_template('login.html'), 200

@app.route('/logout/') 
def logout():
    session['admin'] = False 
    return render_template('login.html')


@app.errorhandler(404)
def page_not_found(error):
    return render_template('base.html'), 200
