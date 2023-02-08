<script lang="ts">
import { defineComponent } from 'vue';
import nhl from '../../results/nhl.json';
import { CombinedMatch, PP } from './../../types';

export default defineComponent({
  data() {
    return {
      data: nhl as CombinedMatch[],
    };
  },
  computed: {
    filteredMatches() {
      return this.combinePlayers(this.data);
    },
  },
  methods: {
    // combine the players in the pp array of matches of data array
    // and allow for player names to a loose match
    // the over and under values should be kept in separate objects for each bookmaker

    combinePlayers(matches: CombinedMatch[]) {
      const combinedPlayers = matches.map((match) => {
        const betc: PP[] = match.pp.betc;
        const tenbet: PP[] = match.pp.tenbet;

        const combined = betc.map((betcPlayer) => {
          const tenbetPlayer = tenbet.find((tenbetPlayer) => {
            return tenbetPlayer.player.includes(betcPlayer.player);
          });

          return {
            player: betcPlayer.player,
            team: betcPlayer.team,
            betc: {
              over: betcPlayer.over,
              under: betcPlayer.under,
            },
            tenbet: {
              over: tenbetPlayer ? tenbetPlayer.over : 0,
              under: tenbetPlayer ? tenbetPlayer.under : 0,
            },
          };
        });
        return {
          home: match.home,
          away: match.away,
          pp: combined,
        };
      });
      return combinedPlayers;
    },

    // check the value of the over and under individually for each value and if the betc value is higher than the tenbet value by 1.0 or more
    // return true, otherwise return false
    checkOverUnder(betc: number, tenbet: number, attr: string) {
      switch (attr) {
        case 'over':
          if (betc - tenbet >= 0.5) {
            return true;
          }
          return false;
        case 'under':
          if (betc - tenbet >= 0.1) {
            return true;
          }
          return false;
        default:
          return false;
      }
    },
  },
});
</script>

<template>
  <div>
    <ul>
      <li class="match" v-for="(match, index) in filteredMatches" :key="index">
        <h4 class="bold">{{ match.home }} - {{ match.away }}</h4>
        <div v-for="p in match.pp" :key="index" class="grid">
          <h5 class="bold">
            {{ p.player }}
            <span v-if="p.team">({{ p.team }})</span>
          </h5>
          <table>
            <thead class="bg">
              <tr>
                <th></th>
                <th class="bold small">Bet Construct</th>
                <th class="bold small">SBtech</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="bold bg small">Over:</td>
                <td
                  :class="{
                    value: checkOverUnder(p.betc.over, p.tenbet.over, 'over'),
                  }"
                >
                  {{ p.betc.over }}
                </td>
                <td>{{ p.tenbet.over }}</td>
              </tr>
              <tr>
                <td class="bold bg small">Under:</td>
                <td
                  :class="{
                    value: checkOverUnder(
                      p.betc.under,
                      p.tenbet.under,
                      'under'
                    ),
                  }"
                >
                  {{ p.betc.under }}
                </td>
                <td>{{ p.tenbet.under }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <hr />
      </li>
    </ul>
  </div>
</template>

<style scoped lang="scss">
* {
  box-sizing: border-box;
}

ul {
  list-style: none;
  padding: 0;
}

.match {
  hr {
    margin: 1rem 0;
  }
}

.grid {
  display: inline-flex;
  flex-direction: column;
  margin: 0 1rem 1rem 0;
}

table {
  border-spacing: 0;
  margin-bottom: 0.5rem;
  thead {
    th {
      padding: 0.25rem 0.5rem;
      border-spacing: 0;
    }
  }

  td {
    padding: 0 0.25rem;

    &.value {
      color: red;
      font-weight: bold;
    }
  }
}

.bg {
  background-color: #f2f2f2;
}

.bold {
  font-weight: bold;
}

.small {
  font-size: 0.8rem;
}
</style>
