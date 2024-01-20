import { TestBed } from '@angular/core/testing';
import { EvalService } from './eval.service';

const getCat = (args: string[]) => {
  const catObject = {
    type: 'Cat',
    name: 'Miss Kitty',
    num: 3,
    says: function() {
      return this.type + ' ' + this.name + ' says meow';
    },
    internalAction: function(args: string[], n: number, t: string) {
      return this.name + ' ' + args.join(' ') + ' ' + n + ' ' + t;
    },
    action: function(n: number, t: string) {
      return this.name + ' ' + args.join(' ') + ' ' + n + ' ' + t;
    },
  }
  return catObject;
}

function getDog(args: string[]) {
  const dogObject = {
    type: 'Dog',
    name: 'Ralph',
    num: 5,
    says: () => (dogObject.type + ' ' + dogObject.name + ' says woof'),
    internalAction: (args: string[], n: number, t: string) => {
      return dogObject.name + ' ' + args.join(' ') + ' ' + n + ' ' + t;
    },
    action: (n: number, t: string) => dogObject.internalAction(args, n, t),
  }
  return dogObject;
}


const getCounter = () => {
  const counterObject = {
     value: 0,
     increment: function() {return ++this.value;}
  }
  return counterObject;
}

const getContext = (args: string[]) => {
  const context = {
    cat: getCat(args),
    dog: getDog(args),
    counter: getCounter()
  }
  return context;
}

const args = ['says', 'meow'];

const context = getContext(args);

describe('EvalService - curried function', () => {
  let service: EvalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EvalService);
  });

  it.each([
    ['Cat.Says()',                    'Cat Miss Kitty says meow'    ],
    ['Dog.Says()',                    'Dog Ralph says woof'         ],
    ['dog.type + " name is " + dog.name',  'Dog name is Ralph'      ],
    ['counter.increment()+counter.increment();counter.value',   2   ],
    ['cat.action(cat.num, "times")',  'Miss Kitty says meow 3 times'],
  ])("01. curried function: when the input is '%s', value is %p", (expr: string, expected: unknown) => {
    const actual = service.simpleEval(expr, context, {caseInsensitive: true});
    expect(actual).toEqual(expected);
  });

});
