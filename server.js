require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const sequelize = require('./Models/db'); 
const Profesor = require('./Models/profesor');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Subject = require('./Models/subject');
const SolvedQuiz = require('./Models/SolvedQuiz');
const ReadMaterial = require('./Models/ReadMaterial');
const Message = require('./Models/message');
const { Op } = require('sequelize');


function getBaseFromReq(req) {
  
  return `${req.protocol}://${req.get('host')}`;
}


function fixUrl(url, req) {
  if (!url) return url;
  const base = getBaseFromReq(req);
  return url.replace(/^https?:\/\/localhost:\d+/i, base);
}


function fixMaterialUrls(material, req) {
  if (!material) return material;
  const m = material.toJSON ? material.toJSON() : { ...material };
  m.fileUrl  = fixUrl(m.fileUrl, req);
  m.imageUrl = fixUrl(m.imageUrl, req);
  return m;
}


const Student = require('./Models/student');
const Material = require('./Models/material');
const Quiz = require('./Models/quiz');
const Admin = require('./Models/admin');

const app = express();
app.set('trust proxy', 1);
const port = 3001;
const cors = require('cors');
const allowedOrigins = [
  'http://localhost:5173',
  'https://nurseconnect-pula.netlify.app' 
];

const corsOptions = {
  origin(origin, cb) {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET','HEAD','PUT','PATCH','POST','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
};


app.use(cors(corsOptions));


app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  next();
});


app.options('*', (req, res) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  }
  res.sendStatus(204);
});


app.use(express.json({ limit: '10mb' })); 


app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
 

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });


let students = [];
let materials = []; 
let quizzes = []; 

function generateKey() {
    return crypto.randomBytes(8).toString('hex');
}

Profesor.associate({ Subject });
Subject.associate({ Profesor });

Student.hasMany(SolvedQuiz);
SolvedQuiz.belongsTo(Student);
Quiz.hasMany(SolvedQuiz);
SolvedQuiz.belongsTo(Quiz);


sequelize.sync()
  .then(() => console.log('Baza podataka je sinkronizirana!'))
  .catch((error) => console.error('Greška pri sinkronizaciji baze:', error));




 
app.get('/health', (req, res) => {
  res.json({ ok: true });
});


app.get('/debug/students/count', async (req, res) => {
  try {
    const n = await Student.count();
    res.json({ count: n });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'DB error' });
  }
});


app.get('/students', async (req, res) => {
  try {
    const studenti = await Student.findAll();
    res.json(studenti);
  } catch (error) {
    console.error('Greška pri dohvaćanju studenata:', error);
    res.status(500).json({ error: 'Greška na serveru.' });
  }
});


app.post('/students', async (req, res) => {
    const { ime, prezime, email, razred } = req.body;

    if (!ime || !prezime || !email || !razred) {
        return res.status(400).json({ error: 'Svi podaci moraju biti prisutni!' });
    }

    try {
        const newStudent = await Student.create({
            ime,
            prezime,
            email,
            kod: generateKey(),  
            razred
        });

        res.status(201).json(newStudent);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Greška pri dodavanju studenta u bazu!' });
    }
});





app.delete('/students/:id', async (req, res) => {
  const studentId = req.params.id;
  try {
    const deleted = await Student.destroy({ where: { id: studentId } });
    if (deleted) {
      res.status(200).json({ message: 'Student obrisan.' });
    } else {
      res.status(404).json({ error: 'Student nije pronađen.' });
    }
  } catch (err) {
    console.error('Greška pri brisanju studenta:', err);
    res.status(500).json({ error: 'Greška na serveru.' });
  }
});


app.post('/login', async (req, res) => {
    const { kod } = req.body;
  
    if (!kod) {
      return res.status(400).json({ error: 'Kod je obavezan!' });
    }
  
    try {
      const student = await Student.findOne({ where: { kod } });
  
      if (!student) {
        return res.status(404).json({ error: 'Student s tim kodom nije pronađen!' });
      }
  
      res.status(200).json({ message: 'Prijava uspješna!', student });
    } catch (error) {
      console.error('Greška pri prijavi:', error);
      res.status(500).json({ error: 'Greška na serveru prilikom prijave.' });
    }
  });


app.get('/materials', async (req, res) => {
  try {
    const all = await Material.findAll();
    const out = all.map(m => fixMaterialUrls(m, req));
    res.status(200).json(out);
  } catch (error) {
    console.error('Greška pri dohvaćanju materijala:', error);
    res.status(500).json({ error: 'Greška na serveru prilikom dohvaćanja materijala.' });
  }
});

  
app.post('/materials', async (req, res) => {
    console.log(req.body);

    const { naziv, opis, imageUrl, fileUrl, subject, razred } = req.body;

    if (!naziv || !opis || !subject) {
        return res.status(400).json({ error: 'Naziv, opis i predmet su obavezni!' });
    }

    try {
        const newMaterial = await Material.create({
            naziv,
            opis,
            imageUrl: imageUrl || null,
            fileUrl: fileUrl || null,
            subject,
            razred
        });

        res.status(201).json(newMaterial);
    } catch (error) {
        console.error('Error while creating material:', error);
        res.status(500).json({ error: 'Došlo je do pogreške prilikom unosa materijala.' });
    }
});


app.put('/materials/:id', async (req, res) => {
    const materialId = parseInt(req.params.id);
    const { naziv, opis, imageUrl, fileUrl } = req.body;
  
    try {
      const material = await Material.findByPk(materialId);
      if (!material) {
        return res.status(404).json({ error: 'Materijal nije pronađen' });
      }
  
      await material.update({
        naziv,
        opis,
        imageUrl: imageUrl || null,
        fileUrl: fileUrl || null,
        subject,
        razred
      });
  
      res.status(200).json(material);
    } catch (error) {
      console.error('Greška pri ažuriranju materijala:', error);
      res.status(500).json({ error: 'Greška pri ažuriranju materijala' });
    }
  });

app.delete('/materials/:id', async (req, res) => {
    const materialId = parseInt(req.params.id);
  
    try {
      const material = await Material.findByPk(materialId);
  
      if (!material) {
        return res.status(404).json({ error: 'Materijal nije pronađen' });
      }
  
      await material.destroy();
  
      console.log(`✔️ Materijal s ID-em ${materialId} je obrisan iz baze.`);
      res.status(204).send();
    } catch (error) {
      console.error('❌ Greška pri brisanju materijala:', error);
      res.status(500).json({ error: 'Greška na serveru prilikom brisanja' });
    }
  });
  
 app.get('/materials/subject/:predmet/razred/:razred', async (req, res) => {
  try {
    const { predmet, razred } = req.params;

    const materijali = await Material.findAll({
      where: { subject: predmet, razred }
    });

    const out = materijali.map(m => fixMaterialUrls(m, req));
    res.status(200).json(out);
  } catch (err) {
    console.error('Greška pri dohvaćanju materijala po predmetu i razredu:', err);
    res.status(500).json({ error: 'Greška na serveru.' });
  }
});




app.get('/quizzes', async (req, res) => {
  try {
    const allQuizzes = await Quiz.findAll();
    res.status(200).json(allQuizzes);
  } catch (error) {
    console.error('Greška pri dohvaćanju kvizova:', error);
    res.status(500).json({ error: 'Greška na serveru.' });
  }
});

app.get('/quizzes/:id', async (req, res) => {
  try {
    const quiz = await Quiz.findByPk(req.params.id);
    if (!quiz) return res.status(404).json({ error: 'Kviz nije pronađen.' });

    let pitanja = quiz.pitanja;

  
    if (typeof pitanja === 'string') {
      try {
        pitanja = JSON.parse(pitanja);
      } catch (e) {
        return res.status(500).json({ error: 'Pitanja nisu validan JSON.' });
      }
    }

    res.json({ ...quiz.toJSON(), pitanja });
  } catch (error) {
    console.error('Greška pri dohvaćanju kviza:', error);
    res.status(500).json({ error: 'Greška na serveru.' });
  }
});


app.get('/quizzes/subject/:predmet', async (req, res) => {
  try {
  const kvizovi = await Quiz.findAll({
    where: {
      predmet: req.params.predmet
    }
  });

  const kvizoviParsed = kvizovi.map(kviz => {
    let pitanja = kviz.pitanja;
    if (typeof pitanja === 'string') {
      try {
        pitanja = JSON.parse(pitanja);
      } catch (e) {
        pitanja = [];
      }
    }
    return { ...kviz.toJSON(), pitanja };
  });

  res.json(kvizoviParsed);
} catch (err) {
  console.error('🔥 Greska u /quizzes/subject/:predmet:', err);
  res.status(500).json({ error: 'Greška na serveru.', detalji: err.message });
}

});


app.post('/quizzes', async (req, res) => {
  try {
    const { naziv, pitanja, predmet, razred, maxPokusaja, profesorId } = req.body;

    const noviKviz = await Quiz.create({
      naziv,
      pitanja,
      predmet,
      razred,
      maxPokusaja: maxPokusaja || 1,
      profesorId
    });

    res.status(201).json({ message: 'Kviz uspješno dodan!', quiz: noviKviz });
  } catch (err) {
    console.error('Greška pri dodavanju kviza:', err);
    res.status(500).json({ error: 'Greška na serveru.' });
  }
});
//
app.post('/quizzes/:id/check-answers', async (req, res) => {
  const { odgovori, studentId } = req.body;
  const quizId = Number(req.params.id);

  if (!quizId || isNaN(quizId)) {
    return res.status(400).json({ error: 'Nevažeći ID kviza.' });
  }

  try {
    const quiz = await Quiz.findByPk(quizId);
    if (!quiz) return res.status(404).json({ error: 'Kviz nije pronađen.' });

   
    const result = await sequelize.query(
      `SELECT COUNT(*) FROM "SolvedQuizzes" WHERE studentid = $1 AND quizid = $2`,
      {
        bind: [studentId, quizId],
        type: Sequelize.QueryTypes.SELECT,
      }
    );

    const brojPokusaja = parseInt(result[0].count || '0', 10);
    const maxPokusaja = quiz.maxPokusaja || 1;

    if (brojPokusaja >= maxPokusaja) {
      return res.status(403).json({ error: 'Dosegnut je maksimalan broj pokušaja za ovaj kviz.' });
    }

    
    let pitanja = quiz.pitanja;
    if (typeof pitanja === 'string') {
      pitanja = JSON.parse(pitanja);
    }

    
    const rezultat = pitanja.map((p, i) => {
      const correct = Array.isArray(p.correct) ? [...p.correct].sort() : [p.correct];
      const user = Array.isArray(odgovori[i]) ? [...odgovori[i]].sort() : [odgovori[i]];
      if (p.type === 'hotspot') {
    const korisnikovKlik = odgovori[i]; // { x, y }
    if (!korisnikovKlik || !p.hotspots || p.hotspots.length === 0) return false;

    return p.hotspots.some(h => {
      const dx = korisnikovKlik.x - h.x;
      const dy = korisnikovKlik.y - h.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance <= h.r;
    });
  }
      return JSON.stringify(correct) === JSON.stringify(user);
    });

    const tocno = rezultat.filter(Boolean).length;
    const ukupno = pitanja.length;

   
    await sequelize.query(
      `INSERT INTO "SolvedQuizzes" (studentid, quizid, result, total, solvedat) VALUES ($1, $2, $3, $4, NOW())`,
      {
        bind: [studentId, quizId, tocno, ukupno],
        type: Sequelize.QueryTypes.INSERT
      }
    );
   


    res.json({ rezultat, tocno, ukupno });
  } catch (error) {
    console.error('Greška pri spremanju rezultata:', error);
    res.status(500).json({ error: 'Greška na serveru.' });
  }
});


app.get('/solved/:studentId/:quizId', async (req, res) => {
  const { studentId, quizId } = req.params;

  try {
    const result = await sequelize.query(
      `SELECT result, total FROM "SolvedQuizzes" WHERE studentid = $1 AND quizid = $2 LIMIT 1`,
      {
        bind: [studentId, quizId],
        type: Sequelize.QueryTypes.SELECT,
      }
    );

    if (result.length > 0) {
      const { result: tocno, total } = result[0];
      const rezultat = Array.from({ length: total }, (_, i) => i < tocno);
      return res.json({ solved: true, rezultat });
    } else {
      return res.json({ solved: false });
    }
  } catch (err) {
    console.error('Greška pri provjeri rješenja:', err);
    res.status(500).json({ error: 'Greška na serveru.' });
  }
});




//

app.post('/quizzes/:id/spremi-rezultat', async (req, res) => {
  const { studentid, odgovori } = req.body;
  const quiz = await Quiz.findByPk(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Kviz nije pronađen.' });

  let pitanja = quiz.pitanja;
  if (typeof pitanja === 'string') {
    pitanja = JSON.parse(pitanja);
  }

  const rezultat = pitanja.map((p, i) => {
    const correct = Array.isArray(p.correct) ? [...p.correct].sort() : [p.correct];
    const user = Array.isArray(odgovori[i]) ? [...odgovori[i]].sort() : [odgovori[i]];
    return JSON.stringify(correct) === JSON.stringify(user);
  });

  const correctCount = rezultat.filter(r => r).length;

  try {
    await SolvedQuiz.create({
      studentid,
      quizId: req.params.id,
      result: correctCount,
      total: pitanja.length,
    });

    res.json({ message: 'Rezultat spremljen.', correct: correctCount, total: pitanja.length });
  } catch (error) {
    console.error('Greška pri spremanju rezultata:', error);
    res.status(500).json({ error: 'Greška na serveru.' });
  }
});

app.get('/quizzes/:quizId/solved/:studentId', async (req, res) => {
  const { quizid, studentid } = req.params;

  try {
    const quiz = await Quiz.findByPk(quizid);
    if (!quiz) return res.status(404).json({ error: 'Kviz nije pronađen.' });

    const solved = await sequelize.query(
      `SELECT * FROM "SolvedQuizzes" WHERE studentid = $1 AND quizid = $2 LIMIT 1`,
      {
        bind: [studentid, quizid],
        type: Sequelize.QueryTypes.SELECT,
      }
    );

    if (!solved.length) {
      return res.json({ alreadySolved: false });
    }

    const { result, total } = solved[0];

    
    let pitanja = quiz.pitanja;
    if (typeof pitanja === 'string') {
      pitanja = JSON.parse(pitanja);
    }

    const rezultat = Array.from({ length: total }, (_, i) => i < result);

    res.json({
      alreadySolved: true,
      rezultat,
      odgovori: [], 
      quiz: { ...quiz.toJSON(), pitanja }
    });
  } catch (err) {
    console.error('Greška pri provjeri kviza:', err);
    res.status(500).json({ error: 'Greška na serveru.' });
  }
});





app.delete('/quizzes/:id', async (req, res) => {
  const id = req.params.id;

  try {
    
    await SolvedQuiz.destroy({ where: { quizId: id } });

    
    const deleted = await Quiz.destroy({ where: { id } });

    if (deleted) {
      res.json({ message: 'Kviz obrisan.' });
    } else {
      res.status(404).json({ message: 'Kviz nije pronađen.' });
    }
  } catch (err) {
    console.error('Greška prilikom brisanja kviza:', err);
    res.status(500).json({ message: 'Greška na serveru.' });
  }
});



app.post('/materials/:id/mark-read', async (req, res) => {
  const { studentId } = req.body;
  const materialId = req.params.id;

  try {
    await ReadMaterial.create({ studentId, materialId });
    res.json({ message: 'Materijal označen kao pročitan.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Greška na serveru.' });
  }
});

app.get('/quizzes/subject/:predmet/razred/:razred', async (req, res) => {
  try {
    const { predmet, razred } = req.params;

    const kvizovi = await Quiz.findAll({
      where: { predmet, razred }
    });

    const kvizoviParsed = kvizovi.map(kviz => {
      let pitanja = kviz.pitanja;
      if (typeof pitanja === 'string') {
        try {
          pitanja = JSON.parse(pitanja);
        } catch (e) {
          pitanja = [];
        }
      }
      return { ...kviz.toJSON(), pitanja };
    });

    res.json(kvizoviParsed);
  } catch (err) {
    console.error('Greška pri dohvaćanju kvizova po predmetu i razredu:', err);
    res.status(500).json({ error: 'Greška na serveru.' });
  }
});









app.post('/login-profesor', async (req, res) => {
    const { kod } = req.body;
  
    if (!kod) {
      return res.status(400).json({ error: 'Kod je obavezan!' });
    }
  
    try {
      const profesor = await Profesor.findOne({ where: { kod } });
  
      if (!profesor) {
        return res.status(404).json({ error: 'Profesor s tim kodom nije pronađen!' });
      }
  
      res.status(200).json({ message: 'Prijava uspješna!', profesor });
    } catch (err) {
      console.error('Greška pri prijavi profesora:', err);
      res.status(500).json({ error: 'Greška na serveru!' });
    }
  });

  // 📌 POST ruta za dodavanje profesora
app.post('/profesori', async (req, res) => {
  const { ime, prezime, email, kod, subjectIds } = req.body;

  if (!ime || !prezime || !email || !kod || !Array.isArray(subjectIds)) {
    return res.status(400).json({ error: 'Sva polja su obavezna!' });
  }

  try {
    const noviProfesor = await Profesor.create({ ime, prezime, email, kod });

    
    await noviProfesor.setSubjects(subjectIds);

    res.status(201).json(noviProfesor);
  } catch (error) {
    console.error('Greška pri dodavanju profesora:', error);
    res.status(500).json({ error: 'Neuspješno dodavanje profesora.' });
  }
});

app.get('/profesori', async (req, res) => {
  try {
    const profesori = await Profesor.findAll({
      attributes: ['id', 'ime', 'prezime', 'email'],
    });
    res.json(profesori);
  } catch (err) {
    console.error('Greška pri dohvaćanju profesora:', err);
    res.status(500).json({ error: 'Greška na serveru' });
  }
});


app.get('/profesori-sve', async (req, res) => {
  try {
    const profesori = await Profesor.findAll({
      include: [{ model: Subject, through: { attributes: [] } }]
    });
    res.json(profesori);
  } catch (err) {
    console.error('Greška pri dohvaćanju profesora s predmetima:', err);
    res.status(500).json({ error: 'Greška na serveru.' });
  }
});




app.get('/subjects', async (req, res) => {
  try {
    const svi = await Subject.findAll();
    res.json(svi);
  } catch (err) {
    console.error('Greška pri dohvaćanju predmeta:', err);
    res.status(500).json({ error: 'Greška na serveru kod predmeta.' });
  }
});



app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Datoteka nije poslana.' });
  }
  const baseUrl = `${req.protocol}://${req.get('host')}`; 
  const fileUrl = `${baseUrl}/uploads/${encodeURIComponent(req.file.filename)}`;
  return res.status(200).json({ fileUrl });
});

  

  app.post('/admin/login', async (req, res) => {
    console.log('POZVANA /admin/login ruta');
  const { email, password } = req.body;

  try {
    const admin = await Admin.findOne({ where: { email } });
    console.log('ADMIN IZ BAZE:', admin);
    if (!admin) return res.status(401).json({ error: 'Neispravni podaci.' });

    const isMatch = await bcrypt.compare(password, admin.lozinka);
    if (!isMatch) return res.status(401).json({ error: 'Neispravni podaci.' });

    const token = jwt.sign({ id: admin.id, role: 'admin' }, 'tajna_lozinka');
    res.json({ token });
    console.log('PRIMLJENI PODACI:', req.body);

  } catch (error) {
    res.status(500).json({ error: 'Greška na serveru.' });
  }
});




app.put('/admin/promjena-lozinke', async (req, res) => {
  const { trenutna, nova } = req.body;

  try {
    const admin = await Admin.findOne({ where: { email: 'admin@nurseconnect.com' } }); 

    if (!admin) {
      return res.status(404).json({ error: 'Admin nije pronađen.' });
    }

    const isMatch = await bcrypt.compare(trenutna, admin.lozinka);
    if (!isMatch) {
      return res.status(401).json({ error: 'Trenutna lozinka nije točna.' });
    }

    const novaHashirana = await bcrypt.hash(nova, 10);
    admin.lozinka = novaHashirana;
    await admin.save();

    res.json({ poruka: 'Lozinka uspješno promijenjena!' });
  } catch (err) {
    console.error('Greška pri promjeni lozinke:', err);
    res.status(500).json({ error: 'Greška na serveru.' });
  }
});


app.get('/admin/statistika', async (req, res) => {
  try {
    const studenti = await Student.count();
    const profesori = await Profesor.count();
    const materijali = await Material.count();
    const kvizovi = await Quiz.count();

    res.json({ studenti, profesori, materijali, kvizovi });
  } catch (err) {
    console.error('Greška u statistici:', err);
    res.status(500).json({ error: 'Greška u dohvaćanju statistike.' });
  }
});




app.get('/profesori/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Neispravan ID (mora biti broj).' });
  }

  try {
    const profesor = await Profesor.findByPk(id, {
      include: [{ model: Subject, through: { attributes: [] } }],
    });
    if (!profesor) return res.status(404).json({ error: 'Profesor nije pronađen.' });
    res.json(profesor);
  } catch (err) {
    console.error('Greška pri dohvaćanju profesora:', err);
    res.status(500).json({ error: 'Greška na serveru.' });
  }
});


app.put('/profesori/:id', async (req, res) => {
  const { id } = req.params;
  const { ime, prezime, email, kod, subjectIds } = req.body;

  try {
    const profesor = await Profesor.findByPk(id);
    if (!profesor) return res.status(404).json({ error: 'Profesor nije pronađen.' });

    
    await profesor.update({ ime, prezime, email, kod });

   
    if (subjectIds && Array.isArray(subjectIds)) {
      await profesor.setSubjects(subjectIds); 
    }

    res.json({ poruka: 'Profesor uspješno ažuriran.' });
  } catch (err) {
    console.error('Greška pri ažuriranju profesora:', err);
    res.status(500).json({ error: 'Greška na serveru.' });
  }
});


app.delete('/profesori/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const profesor = await Profesor.findByPk(id);

    if (!profesor) {
      return res.status(404).json({ error: 'Profesor nije pronađen.' });
    }

    
    await profesor.setSubjects([]); 

    await profesor.destroy();

    res.json({ poruka: 'Profesor obrisan.' });
  } catch (err) {
    console.error('Greška pri brisanju profesora:', err);
    res.status(500).json({ error: 'Greška na serveru.' });
  }
});



app.put('/students/:id', async (req, res) => {
  const { id } = req.params;
  const { ime, prezime, email, razred } = req.body;

  try {
    const student = await Student.findByPk(id);
    if (!student) return res.status(404).json({ error: 'Student nije pronađen.' });

    await student.update({ ime, prezime, email, razred });

    res.json({ message: 'Student uspješno ažuriran.' });
  } catch (err) {
    console.error('Greška pri ažuriranju studenta:', err);
    res.status(500).json({ error: 'Greška na serveru.' });
  }
});








// Slanje poruke
app.post('/messages', async (req, res) => {
  const { senderId, receiverId, content } = req.body;
  try {
    const message = await Message.create({ senderId, receiverId, content });
    res.status(201).json(message);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Greška pri slanju poruke.' });
  }
});


app.get('/messages/unread/:receiverId', async (req, res) => {
  const { receiverId } = req.params;
  try {
    const messages = await Message.findAll({
      where: {
        receiverId,
        read: false
      }
    });

    const counts = {};
    messages.forEach(msg => {
      counts[msg.senderId] = (counts[msg.senderId] || 0) + 1;
    });

    res.json(counts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Greška pri dohvaćanju nepročitanih poruka.' });
  }
});




// Dohvaćanje razgovora između dva profesora
app.get('/messages/:senderId/:receiverId', async (req, res) => {
  const { senderId, receiverId } = req.params;
  try {
    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { senderId: senderId, receiverId: receiverId },
          { senderId: receiverId, receiverId: senderId }
        ]
      },
      order: [['timestamp', 'ASC']]
    });
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Greška pri dohvaćanju poruka.' });
  }
});

app.post('/messages/mark-read', async (req, res) => {
  const { senderId, receiverId } = req.body;
  try {
    await Message.update(
      { read: true },
      {
        where: {
          senderId,
          receiverId,
          read: false
        }
      }
    );
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Greška prilikom označavanja pročitanih poruka.' });
  }
});



app.get('/unread-count/:receiverId', async (req, res) => {
  const { receiverId } = req.params;
  try {
    const counts = await Message.findAll({
      attributes: ['senderId', [sequelize.fn('COUNT', sequelize.col('id')), 'unreadCount']],
      where: {
        receiverId,
        read: false
      },
      group: ['senderId']
    });
    res.json(counts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Greška pri dohvaćanju broja nepročitanih poruka.' });
  }
});


app.put('/messages/mark-as-read', async (req, res) => {
  const { senderId, receiverId } = req.body;
  try {
    await Message.update(
      { read: true },
      {
        where: {
          senderId,
          receiverId,
          read: false
        }
      }
    );
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Greška pri označavanju poruka kao pročitanih.' });
  }
});



app.get('/api/v1/professor/:id/quiz-summary', async (req, res) => {
  try {
    const professorId = req.params.id;

    const quizzes = await Quiz.findAll({ where: { profesorId: professorId } });
    const quizIds = quizzes.map(q => q.id);

    const solved = await SolvedQuiz.findAll({ where: { quizId: quizIds } });

    const totalAttempts = solved.length;
    const totalCorrect = solved.reduce((acc, s) => acc + s.correct, 0);
    const totalQuestions = solved.reduce((acc, s) => acc + s.total, 0);

    const avgScore = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

    res.json({
      totalQuizzes: quizzes.length,
      totalAttempts,
      avgScore
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Greška pri dohvaćanju analize' });
  }
});


app.get('/profesori/:id/quiz-statistics', async (req, res) => {
  const profesorId = req.params.id;

  try {
    const quizzes = await Quiz.findAll({ where: { profesorId } });

    const statistics = await Promise.all(
      quizzes.map(async (quiz) => {
        const solved = await SolvedQuiz.findAll({ where: { quizId: quiz.id }, include: ['student'] });

        const brojPokusaja = solved.length;
        const ukupnoBodova = solved.reduce((sum, q) => sum + Number(q.result), 0);
const ukupnoMoguce = solved.reduce((sum, q) => sum + Number(q.total), 0);

return {
  id: quiz.id,
  naziv: quiz.naziv,
  razred: quiz.razred,
  brojPokusaja,
  prosjek: ukupnoMoguce > 0 ? Math.round((ukupnoBodova / ukupnoMoguce) * 100) : 0
};

      })
    );

    res.json(statistics);
  } catch (err) {
    console.error('Greška pri dohvaćanju statistike:', err);
    res.status(500).json({ message: 'Greška na serveru.' });
  }
});

app.get('/api/v1/quiz/:quizId/detalji', async (req, res) => {
  const quizId = req.params.quizId;

  try {
    const attempts = await SolvedQuiz.findAll({
  where: { quizId },
  attributes: ['id', 'studentId', 'quizId', 'result', 'total', 'solvedAt'], 
  include: [
    {
      model: Student,
      as: 'student',
      attributes: ['ime', 'prezime']
    }
  ],
  order: [['solvedAt', 'DESC']]
});


    res.json({ pokusaji: attempts });
  } catch (err) {
    console.error('Greška pri dohvaćanju detalja kviza:', err);
    res.status(500).json({ message: 'Greška na serveru.' });
  }
});



app.get('/api/v1/progress/:studentId', async (req, res) => {
  const studentId = parseInt(req.params.studentId, 10)

  try {
    
    res.set('Cache-Control', 'no-store')

    
    const reads = await ReadMaterial.findAll({
      where: { studentid: studentId },   
      attributes: ['materialid'],        
      raw: true
    })

    
    const solves = await SolvedQuiz.findAll({
      where: { studentId: studentId },   
      attributes: ['quizId'],             
      raw: true
    })

    const readMaterialIds = reads.map(r => r.materialid)
    const solvedQuizIds   = solves.map(s => s.quizId)

    return res.json({ readMaterialIds, solvedQuizIds })

  } catch (err) {
    console.error('Greška u dohvaćanju napretka:', err)
    return res.status(500).json({ error: 'Server error' })
  }
})



app.post('/api/v1/progress/:studentId/read/:materialId', async (req, res) => {
  const studentId  = parseInt(req.params.studentId, 10)
  const materialId = parseInt(req.params.materialId, 10)
  try {
    
    await ReadMaterial.create({
      studentid:  studentId,
      materialid: materialId
    })
    
    return res.sendStatus(200)
  } catch (err) {
    console.error('Greška pri označavanju pročitanog materijala:', err)
    return res.status(500).json({ error: 'Server error' })
  }
})





app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

sequelize.authenticate()
  .then(() => {
    console.log('Veza s bazom je uspješno uspostavljena!');
  })
  .catch(err => {
    console.error('Nije moguće uspostaviti vezu s bazom:', err);
  });







