import { TestBed } from '@angular/core/testing';
import { EvalService } from './eval.service';
import { EvalContext, EvalScope, EvalScopeOptions } from '../../internal/classes/eval';

const args = ['says', 'meow'];

const cat = {
  type: 'Cat',
  name: 'Miss Kitty',
  num: 3,
  says: function() {return this.type + ' ' + this.name + ' says meow';},
  action: function(args: string[], n: number, t: string) {return this.name + ' ' + args.join(' ') + ' ' + n + ' ' + t;},
}

const dog = {
  type: 'Dog',
  name: 'Ralph',
  num: 5,
  says: function() {return this.type + ' ' + this.name + ' says woof';},
  action: function(args: string[], n: number, t: string) {return this.name + ' ' + args.join(' ') + ' ' + n + ' ' + t;},
}

const getCounter = () => {
  const counterObject = {
     value: 0,
     increment: function() {return ++this.value;}
  }
  return counterObject;
}

const context = {
  counter: getCounter(),
  args: args
}

const evalContext = new EvalContext(context, {caseInsensitive: true});

const catOptions: EvalScopeOptions = {
  global: false,
  caseInsensitive: false,
  namespace: 'cat',
  thisArg: cat
};
evalContext.priorScopes.push(EvalScope.fromObject(cat, catOptions));

const dogOptions: EvalScopeOptions = {
  global: false,
  caseInsensitive: true,
  namespace: 'dog',
  thisArg: dog
};
evalContext.priorScopes.push(EvalScope.fromObject(dog, dogOptions));


describe('EvalService', () => {
  let service: EvalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EvalService);
  });

  it('should evaluate a eval-scope expression', () => {
    const expression = 'cat.action(args, cat.num, "times")';
    const result = service.simpleEval(expression, evalContext);
    expect(result).toEqual('Miss Kitty says meow 3 times');
  });

  it('should evaluate a eval-scope case-intensitive expression', () => {
    const expression = 'Dog.Says()';
    const result = service.simpleEval(expression, evalContext, {caseInsensitive: true});
    expect(result).toEqual('Dog Ralph says woof');
  });

});
