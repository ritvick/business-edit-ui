<template>
  <v-card flat id="articles">
    <div class="articles-header pa-5">
      <v-icon color="appDkBlue">mdi-handshake</v-icon>
      <label class="articles-title pl-2">Articles</label>
    </div>

    <div
      v-if="isAlterationFiling && getBusinessInformation.hasRestrictions"
      class="section-container"
      :class="{'invalid-section': invalidCompanyProvisions}"
    >
      <CompanyProvisions
        :provisionsRemoved="areProvisionsRemoved"
        @isChanged="setProvisionsRemoved($event)"
        @haveChanges="emitHaveChanges($event)"
        @isEditing="setEditingCompanyProvisions($event)"
      />
    </div>

    <div
      class="section-container"
      :class="{'invalid-section': invalidResolutionDates}"
    >
      <ResolutionDates
        :addedDates="getNewResolutionDates"
        :previousDates="getOriginalResolutions"
        :isEditMode="true"
        :hasRightsOrRestrictions="getHasRightsOrRestrictions"
        @addRemoveDate="setNewResolutionDates($event)"
        @isEditing="setIsAddingResolutionDate($event)"
      />
    </div>
  </v-card>
</template>

<script lang="ts">
import { Component, Emit, Mixins } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'
import CompanyProvisions from './CompanyProvisions.vue'
import ResolutionDates from './ResolutionDates.vue'
import { CommonMixin } from '@/mixins/'
import { ActionBindingIF, BusinessInformationIF, ResolutionsIF } from '@/interfaces/'

@Component({
  components: {
    CompanyProvisions,
    ResolutionDates
  }
})
export default class Articles extends Mixins(CommonMixin) {
  private isEditingCompanyProvisions = false
  private isAddingResolutionDate = false

  // Global getters
  @Getter getBusinessInformation!: BusinessInformationIF
  @Getter getNewResolutionDates!: string[]
  @Getter areProvisionsRemoved!: boolean
  @Getter getOriginalResolutions!: ResolutionsIF[]
  @Getter getHasRightsOrRestrictions!: boolean
  @Getter getIsResolutionDatesValid!: boolean
  @Getter getComponentValidate!: boolean
  @Getter isAlterationFiling!: boolean

  // Global actions
  @Action setProvisionsRemoved!: ActionBindingIF
  @Action setNewResolutionDates!: ActionBindingIF
  @Action setValidComponent!: ActionBindingIF

  /** Emits Have Changes event. */
  @Emit('haveChanges')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected emitHaveChanges (haveChanges: boolean): void {}

  protected setEditingCompanyProvisions (editing: boolean) {
    this.isEditingCompanyProvisions = editing
    this.setValidComponent({ key: 'isValidCompanyProvisions', value: !editing })
  }

  protected setIsAddingResolutionDate (addingResolutionDate: boolean) {
    this.isAddingResolutionDate = addingResolutionDate
  }

  get invalidCompanyProvisions (): boolean {
    return this.getComponentValidate && this.isEditingCompanyProvisions
  }

  get invalidResolutionDates (): boolean {
    return this.getComponentValidate && (this.isAddingResolutionDate || !this.getIsResolutionDatesValid)
  }
}
</script>

<style lang="scss" scoped>
@import '@/assets/styles/theme.scss';

.articles-header {
  display: flex;
  background-color: $BCgovBlue5O;
}
</style>
