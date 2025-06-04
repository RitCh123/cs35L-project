# Eclipse Gaming Lounge 
Naren Sathishkumar, Dhwani Beesanahalli, Nikhil Dewitt, Rithvik Chavali

### Description

The Eclipse Gaming Lounge reservation system is designed to help both gamers and administrators alike in handling reservations times. During busy hours, administrators can feel lost in handling wait times, managing queues, and helping fellow gamers with any troubles. We designed this reservation system to alleviate any unforseen problems that administrators and gamers have about reserving times in the gaming lounge.

## Get Started

### Cloning

To get started, locally clone the Github repoistory via the command:

```git clone https://github.com/RitCh123/cs35L-project.git```

Alternatively, you can download the tarball provided in the project submission.

**If you decide to clone the Github repoistory manually, you must separately add a ```.env``` file containing the list of database and Firebase passwords**. The filepath for the ```.env``` file should be as follows: ```cs35L-project/game-reservation/.env```.

### Running Development

Once you have obtained a local copy of the source code, enter into the ```cs35L-project``` folder from the cloned Github or the tarball file, wherever you have a local copy on your computer. Once you've entered into the ```cs35L-project``` directory, run the following command:

``` cd game-reservation ```

to enter the program folder. After entering the ```game-reservation``` folder, run

```npm install```

to install all packages and dependencies locally on your computer. Running ```npm``` will automatically install these packages, but we have had some dependency version conflicts, and running the command above fixes those issues. 

After installing all the packages, run

```npm run dev```

to start both the development server (backend) and frontend.