const mongoose = require('mongoose');
const SubjectQuestion = require('../backend/models/SubjectQuestion'); // We will run this from backend
require('dotenv').config({ path: './.env' });

const generateCQuestions = (bank) => {
    const questions = [];
    const topics = [
        { name: "Pointers", code: (i) => `int a = ${i}; int *p = &a; printf("%d", *p);`, ans: (i) => `${i}`, w1: (i)=>`${i+1}`, w2: (i)=>`Address of a`, w3: (i)=>`Compilation Error` },
        { name: "Arrays", code: (i) => `int arr[] = {${i}, ${i+1}, ${i+2}}; printf("%d", arr[1]);`, ans: (i) => `${i+1}`, w1: (i)=>`${i}`, w2: (i)=>`${i+2}`, w3: (i)=>`Garbage value` },
        { name: "Loops", code: (i) => `int x=0; for(int j=0; j<${i%5 + 2}; j++){ x++; } printf("%d", x);`, ans: (i) => `${i%5 + 2}`, w1: (i)=>`${i%5 + 1}`, w2: (i)=>`${i%5 + 3}`, w3: (i)=>`0` },
        { name: "Conditionals", code: (i) => `int x = ${i}; if(x > ${i-1}) printf("A"); else printf("B");`, ans: (i) => `A`, w1: (i)=>`B`, w2: (i)=>`AB`, w3: (i)=>`Compiler Error` },
        { name: "Macros", code: (i) => `#define SQ(x) x*x\nprintf("%d", SQ(${i%4 + 2} + 1));`, ans: (i) => `${(i%4 + 2) + 1 * (i%4 + 2) + 1}`, w1: (i)=>`${((i%4 + 2)+1) * ((i%4 + 2)+1)}`, w2: (i)=>`0`, w3: (i)=>`Error` },
        { name: "Structs", code: (i) => `struct Point { int x, y; } p1 = {${i}, ${i+1}}; printf("%d", p1.x);`, ans: (i) => `${i}`, w1: (i)=>`${i+1}`, w2: (i)=>`0`, w3: (i)=>`Address` },
        { name: "Bitwise", code: (i) => `printf("%d", ${i%4 + 1} << 1);`, ans: (i) => `${(i%4 + 1) * 2}`, w1: (i)=>`${(i%4 + 1)}`, w2: (i)=>`${(i%4 + 1) / 2}`, w3: (i)=>`0` },
        { name: "Strings", code: (i) => `char str[] = "C Prog"; printf("%c", str[${i%3}]);`, ans: (i) => `"C Prog"[${i%3}]`, w1: (i)=>`P`, w2: (i)=>`r`, w3: (i)=>`o` },
        { name: "Math", code: (i) => `printf("%d", ${i+10} % 3);`, ans: (i) => `${(i+10) % 3}`, w1: (i)=>`${((i+10) % 3) + 1}`, w2: (i)=>`3`, w3: (i)=>`0` },
        { name: "Functions", code: (i) => `int f(int n) { return n+${i}; }\nprintf("%d", f(5));`, ans: (i) => `${5+i}`, w1: (i)=>`${4+i}`, w2: (i)=>`${6+i}`, w3: (i)=>`Error` }
    ];

    for (let i = 1; i <= 100; i++) {
        let topicTemplate = topics[i % 10];
        let qText = `What will be the output of the following C code?\n\n#include <stdio.h>\nint main() {\n  ${topicTemplate.code(i)}\n  return 0;\n}`;
        let actualAns = topicTemplate.name === 'Strings' ? "C Prog"[i%3] : topicTemplate.ans(i);
        let opts = [actualAns, topicTemplate.w1(i), topicTemplate.w2(i), topicTemplate.w3(i)].map(String);
        
        if (i % 4 === 0) {
            const theoryQ = [
                { q: `Which header file contains the definition of malloc in C?`, a: `stdlib.h`, w: [`stdio.h`, `math.h`, `string.h`] },
                { q: `What is the size of an int pointer in a 64-bit C architecture?`, a: `8 bytes`, w: [`4 bytes`, `2 bytes`, `16 bytes`] },
                { q: `Which of the following is not a valid storage class in C?`, a: `dynamic`, w: [`auto`, `register`, `extern`] },
                { q: `What does the 'continue' statement do in C?`, a: `Skips the remaining statements in the current iteration of a loop.`, w: [`Exits the loop entirely.`, `Exits the program.`, `Restarts the loop from the beginning.`] }
            ][(i/4) % 4];
            qText = theoryQ.q;
            opts = [theoryQ.a, ...theoryQ.w];
            actualAns = theoryQ.a;
        }

        opts = opts.sort(() => Math.random() - 0.5);

        questions.push({
            subject: 'C',
            bank: bank,
            question: qText,
            options: opts,
            correctAnswer: actualAns
        });
    }
    return questions;
};

const generatePythonQuestions = (bank) => {
    const questions = [];
    const topics = [
        { name: "Lists", code: (i) => `x = [${i}, ${i+1}, ${i+2}]\nprint(x[1])`, ans: (i) => `${i+1}`, w1: (i)=>`${i}`, w2: (i)=>`${i+2}`, w3: (i)=>`IndexError` },
        { name: "Slicing", code: (i) => `x = "Python"\nprint(x[0:${i%3 + 2}])`, ans: (i) => `"Python".substring(0, ${i%3 + 2})`, w1: (i)=>`Py`, w2: (i)=>`Pyt`, w3: (i)=>`Python` },
        { name: "Dicts", code: (i) => `d = {"a": ${i}, "b": ${i+1}}\nprint(d.get("a", 0))`, ans: (i) => `${i}`, w1: (i)=>`${i+1}`, w2: (i)=>`0`, w3: (i)=>`KeyError` },
        { name: "Sets", code: (i) => `s1 = {${i}, ${i+1}}\ns2 = {${i+1}, ${i+2}}\nprint(len(s1 & s2))`, ans: (i) => `1`, w1: (i)=>`0`, w2: (i)=>`2`, w3: (i)=>`3` },
        { name: "Strings", code: (i) => `print("Abc".lower() == "abc")`, ans: (i) => `True`, w1: (i)=>`False`, w2: (i)=>`Error`, w3: (i)=>`None` },
        { name: "Math", code: (i) => `print(${i+2} ** 2)`, ans: (i) => `${(i+2)*(i+2)}`, w1: (i)=>`${(i+2)*2}`, w2: (i)=>`${i+2}`, w3: (i)=>`0` },
        { name: "Lambdas", code: (i) => `f = lambda x: x + ${i}\nprint(f(5))`, ans: (i) => `${5+i}`, w1: (i)=>`${5}`, w2: (i)=>`${i}`, w3: (i)=>`SyntaxError` },
        { name: "Types", code: (i) => `print(type(${i}.0))`, ans: (i) => `<class 'float'>`, w1: (i)=>`<class 'int'>`, w2: (i)=>`<class 'double'>`, w3: (i)=>`<class 'number'>` },
        { name: "Bools", code: (i) => `print(bool(${i % 2 === 0 ? "0" : "1"}))`, ans: (i) => `${i % 2 === 0 ? "False" : "True"}`, w1: (i)=>`${i % 2 === 0 ? "True" : "False"}`, w2: (i)=>`None`, w3: (i)=>`Error` },
        { name: "Loops", code: (i) => `x = [i for i in range(${i%4 + 2})]\nprint(len(x))`, ans: (i) => `${i%4 + 2}`, w1: (i)=>`${i%4 + 1}`, w2: (i)=>`${i%4 + 3}`, w3: (i)=>`0` }
    ];

    for (let i = 1; i <= 100; i++) {
        let topic = topics[i % 10];
        let qText = `What will be the output of the following Python code?\n\n${topic.code(i)}`;
        let actualAns = topic.name === 'Slicing' ? "Python".substring(0, (i%3 + 2)) : topic.ans(i);
        let opts = [actualAns, topic.w1(i), topic.w2(i), topic.w3(i)].map(String);

        if (i % 4 === 0) {
            const theoryQ = [
                { q: `Which of the following data structures is immutable in Python?`, a: `Tuple`, w: [`List`, `Dictionary`, `Set`] },
                { q: `How do you declare a private variable in a Python class?`, a: `By prefixing the name with a double underscore (__)`, w: [`By using the 'private' keyword`, `By prefixing with a single underscore (_)`, `Variables cannot be private in Python`] },
                { q: `What is the purpose of the 'pass' statement in Python?`, a: `It acts as a placeholder when a statement is required syntactically but no code needs to be executed.`, w: [`It terminates the program immediately.`, `It skips to the next iteration of a loop.`, `It defines a new function.`] },
                { q: `Which keyword is used to handle exceptions in Python?`, a: `try/except`, w: [`catch`, `try/catch`, `throw`] }
            ][(i/4) % 4];
            qText = theoryQ.q;
            opts = [theoryQ.a, ...theoryQ.w];
            actualAns = theoryQ.a;
        }

        opts = opts.sort(() => Math.random() - 0.5);

        questions.push({
            subject: 'Python',
            bank: bank,
            question: qText,
            options: opts,
            correctAnswer: actualAns
        });
    }
    return questions;
};

const generateJavaQuestions = (bank) => {
    const questions = [];
    const topics = [
        { name: "Arrays", code: (i) => `int[] arr = new int[]{${i}, ${i+1}}; System.out.print(arr[0]);`, ans: (i) => `${i}`, w1: (i)=>`${i+1}`, w2: (i)=>`0`, w3: (i)=>`ArrayIndexOutOfBoundsException` },
        { name: "Strings", code: (i) => `String s = "Java${i}"; System.out.print(s.length());`, ans: (i) => `${("Java" + i).length}`, w1: (i)=>`4`, w2: (i)=>`5`, w3: (i)=>`Compilation Error` },
        { name: "Math", code: (i) => `System.out.print(Math.max(${i}, ${i+5}));`, ans: (i) => `${i+5}`, w1: (i)=>`${i}`, w2: (i)=>`${i+10}`, w3: (i)=>`0` },
        { name: "Logic", code: (i) => `System.out.print(${i} > 0 && ${i} < 100);`, ans: (i) => `true`, w1: (i)=>`false`, w2: (i)=>`1`, w3: (i)=>`0` },
        { name: "Loops", code: (i) => `int c=0; for(int j=0; j<${i%5+1}; j++) c++; System.out.print(c);`, ans: (i) => `${i%5+1}`, w1: (i)=>`${i%5}`, w2: (i)=>`0`, w3: (i)=>`${i%5+2}` },
        { name: "Switch", code: (i) => `int x=1; switch(x){ case 1: System.out.print("A"); break; default: System.out.print("B"); }`, ans: (i) => `A`, w1: (i)=>`B`, w2: (i)=>`AB`, w3: (i)=>`Error` },
        { name: "Classes", code: (i) => `class A { int x = ${i}; } A a = new A(); System.out.print(a.x);`, ans: (i) => `${i}`, w1: (i)=>`0`, w2: (i)=>`null`, w3: (i)=>`Compilation Error` },
        { name: "Exceptions", code: (i) => `try { int x = ${i}/0; } catch(Exception e) { System.out.print("E"); }`, ans: (i) => `E`, w1: (i)=>`0`, w2: (i)=>`ArithmeticException`, w3: (i)=>`Compilation Error` },
        { name: "Casting", code: (i) => `double d = ${i}.5; int x = (int)d; System.out.print(x);`, ans: (i) => `${i}`, w1: (i)=>`${i}.5`, w2: (i)=>`${i+1}`, w3: (i)=>`Error` },
        { name: "Ternary", code: (i) => `System.out.print(${i} % 2 == 0 ? "E" : "O");`, ans: (i) => `${i % 2 === 0 ? "E" : "O"}`, w1: (i)=>`${i % 2 === 0 ? "O" : "E"}`, w2: (i)=>`true`, w3: (i)=>`false` }
    ];

    for (let i = 1; i <= 100; i++) {
        let topic = topics[i % 10];
        let qText = `What will be the output of the following Java code snippet?\n\n${topic.code(i)}`;
        let actualAns = topic.ans(i);
        let opts = [actualAns, topic.w1(i), topic.w2(i), topic.w3(i)].map(String);

        if (i % 4 === 0) {
            const theoryQ = [
                { q: `Which of these access specifiers allows the highest visibility in Java?`, a: `public`, w: [`protected`, `private`, `default`] },
                { q: `What is the default value of an uninitialized instance boolean variable in Java?`, a: `false`, w: [`true`, `null`, `0`] },
                { q: `Which interface does the java.util.ArrayList class implement?`, a: `List`, w: [`Set`, `Map`, `Queue`] },
                { q: `Can a class in Java extend multiple classes directly?`, a: `No`, w: [`Yes`, `Only if they are abstract classes`, `Only if they are final classes`] }
            ][(i/4) % 4];
            qText = theoryQ.q;
            opts = [theoryQ.a, ...theoryQ.w];
            actualAns = theoryQ.a;
        }

        opts = opts.sort(() => Math.random() - 0.5);

        questions.push({
            subject: 'Java',
            bank: bank,
            question: qText,
            options: opts,
            correctAnswer: actualAns
        });
    }
    return questions;
};

const runMigration = async () => {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/knowledge-hub', { useNewUrlParser: true });
        console.log("Connected successfully.");

        // Check if Bank 4 questions exist
        const bank4Questions = await SubjectQuestion.countDocuments({ bank: 4 });
        if (bank4Questions > 0) {
            console.log(`Bank 4 already exists with ${bank4Questions} questions. Deleting to regenerate properly...`);
            await SubjectQuestion.deleteMany({ bank: 4 });
        }

        console.log("Generating 100 questions per subject for Bank 4...");
        const allQuestionsToInsert = [
            ...generateCQuestions(4),
            ...generatePythonQuestions(4),
            ...generateJavaQuestions(4)
        ];

        console.log(`Total questions generated: ${allQuestionsToInsert.length} (Expected: 300)`);
        
        await SubjectQuestion.insertMany(allQuestionsToInsert);
        
        console.log("✅ Success! Bank 4 has been heavily populated for all subjects.");
        process.exit(0);
    } catch (e) {
        console.error("Migration failed:", e);
        process.exit(1);
    }
};

runMigration();
