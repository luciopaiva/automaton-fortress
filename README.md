
# Automaton Fortress

Water flowing experiment focused on keeping fluid leveled across interconnected containers.

Although this has nothing to do with Dwarf Fortress per se (despite the fact that DF also simulates fluids), I decided to pay homage to it and play with its text-based interface.

My first attempt is at trying to simulate it like cellular automata, i.e., each cell in the grid follows very strict rules based on its neighborhood to decide what should be its next state. Like one would expect of cellular automata systems, during its iteration a cell can only modify itself. I don't necessarily have to adhere to this rule, but doing so can be helpful if I decide to implement it as a WebGL shader, since I'm not sure I can modify other cell during execution (need to check this!).

With that in mind, let's think about how water would flow.

## Falling

Consider this situation:

  ? ? ?
  ? ~ ?
  ? . ?
  ? ? ?

Where `~` represents a water cell, `.` represents an empty space and `?` represents an irrelevant cell.

When its time for `~` to step, the rule is: "if there is space below me, turn me into space". Complementary, `.` runs the rule: "if there is water above me, turn me into water". The next state should be:

  ? ? ?
  ? . ?
  ? ~ ?
  ? ? ?

And the water effectively fell down.

But now what about this state:

 ? ? ? ? ?
 ? ? ~ ? ?
 # ~ . ~ #
 # # # # #

Here `#` is a solid wall. What happens to the three water tiles? In case the ones at the same level as the empty spot decide to take the empty spot, we can have a final state where more than one water tile decided to take the empty tile. If the simulation is flawed, it will make water disappear. Say that the left water tile rule is: "considering I can't go down, can I go sideways? If my flow direction is left and there's a wall there, change my direction to right. If my flow direction is right and there's an empty space, make me disappear". For the water tile to be present in the next state, the empty space rule would need to be: "check water tiles all around me. If there's water above me, make me water. If there's also water on my left side and its flow direction is right, make me water with weight 2. If there's water on my right side and it's coming my way too, make my weight 3". Resulting state:

 ? ? ? ? ?
 ? ? . ? ?
 # . 3 . #
 # # # # #

Then, in the next step, that new water tile with weight 3 would need to relieve its excess water somehow. Maybe it would work, I guess. The rule would be: "if my weight is 3 and there's empty slots on both sides, make me weight 1". On the left empty tile, the rule would be complementary: "if there's a water tile weight 3 on my right, turn me into water with weight 1". The same rule would apply to the empty spot on the right side:

 ? ? ? ? ?
 ? ? . ? ?
 # ~ ~ ~ #
 # # # # #

And then the system would enter an equilibrium state. All three water tiles would not be able to move anymore.

Is it possible to simulate it by looking only at my closest 8 neighbors? What about this situation:

    ~
    ~
    .

The top water tile won't move since there's water below it. Maybe it'd try to move sideways (what would be even worse)? Anyway, consider it won't move. The bottom water tile decides to disappear, since there's space below it. The space decides to turn into water, since there's water above it:

    ~
    .
    ~

Weird state. In the next step the top water tile will finally start to fall. How can that be avoided?

## Miscellaneous references

Good simulation here: https://www.youtube.com/watch?v=tG2SP4F4dUc

[This article](https://w-shadow.com/blog/2009/09/01/simple-fluid-simulation/) proposes using an idea of compressible water. A cell can temporarily store more water than it would under equilibrium. It would then try and get rid of its excess water in the next steps.

[Here](http://www.gamasutra.com/view/feature/3549/interview_the_making_of_dwarf_.php?page=9) Tarn discusses how it handled U-shaped tubes by teleporting water from one side to the other.

Relevant reading:

- http://dwarffortresswiki.org/index.php/v0.34:Water
- http://dwarffortresswiki.org/index.php/v0.34:Flow
- http://dwarffortresswiki.org/index.php/v0.34:Pressure

Similar projects:

- http://dan-ball.jp/en/javagame/dust/game.php?g=dust&v=9.5
  Interesting, follows the new "powder" sand game fashion
- http://www.github.com/bananaoomarang/Dust
  Says it's using shaders, but all cellular automata calculations happen in the CPU :-P

Both projects above follow the idea that only particles are cellular automata, when in my case empty spaces are also cells. My rules are also more general, I think. They rely on randomizing stuff, while my rules are deterministic (at least for now!). Which approach is going to be a better fit for GPU processing?
